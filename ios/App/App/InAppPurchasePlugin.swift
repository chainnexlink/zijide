@preconcurrency import Foundation
@preconcurrency import Capacitor
import StoreKit

@objc(InAppPurchasePlugin)
public class InAppPurchasePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InAppPurchasePlugin"
    public let jsName = "InAppPurchase"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: "promise"),
        CAPPluginMethod(name: "getProducts", returnType: "promise"),
        CAPPluginMethod(name: "purchaseProduct", returnType: "promise"),
        CAPPluginMethod(name: "restorePurchases", returnType: "promise"),
        CAPPluginMethod(name: "getReceipt", returnType: "promise"),
        CAPPluginMethod(name: "finishTransaction", returnType: "promise"),
    ]

    private var products: [String: Product] = [:]

    // MARK: - Plugin Methods

    @objc func initialize(_ call: CAPPluginCall) {
        call.resolve(["success": true])
    }

    @objc func getProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds", String.self) else {
            call.reject("productIds is required")
            return
        }

        Task { @MainActor in
            do {
                var storeProducts: [Product] = []
                let requestedIds = Set(productIds)

                // Retry up to 3 times with delay - sandbox/review environment may need time to sync
                for attempt in 1...3 {
                    storeProducts = try await Product.products(for: requestedIds)
                    if !storeProducts.isEmpty {
                        break
                    }
                    if attempt < 3 {
                        try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000)
                    }
                }

                var productList: [[String: Any]] = []

                for product in storeProducts {
                    self.products[product.id] = product
                    let productInfo: [String: Any] = [
                        "productId": product.id,
                        "title": product.displayName,
                        "description": product.description,
                        "price": product.displayPrice,
                        "priceValue": NSDecimalNumber(decimal: product.price).doubleValue,
                    ]
                    productList.append(productInfo)
                }

                call.resolve([
                    "products": productList,
                    "requestedCount": productIds.count,
                    "returnedCount": storeProducts.count,
                ])
            } catch {
                call.reject("Failed to fetch products: \(error.localizedDescription)")
            }
        }
    }

    @objc func purchaseProduct(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId is required")
            return
        }

        Task { @MainActor in
            do {
                let product: Product
                if let cached = self.products[productId] {
                    product = cached
                } else {
                    // Retry fetching the specific product with delay
                    var fetched: Product? = nil
                    for attempt in 1...3 {
                        fetched = try? await Product.products(for: [productId]).first
                        if fetched != nil { break }
                        if attempt < 3 {
                            try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000)
                        }
                    }
                    guard let foundProduct = fetched else {
                        call.reject("Product not found: \(productId). Please ensure the product is configured in App Store Connect and try again.")
                        return
                    }
                    product = foundProduct
                    self.products[productId] = product
                }

                let result = try await product.purchase()

                switch result {
                case .success(let verification):
                    let transaction = try self.checkVerified(verification)
                    let jwsRepresentation = verification.jwsRepresentation

                    // Get the legacy app store receipt for server-side verification
                    var appReceipt = ""
                    if let receiptURL = Bundle.main.appStoreReceiptURL,
                       let receiptData = try? Data(contentsOf: receiptURL) {
                        appReceipt = receiptData.base64EncodedString()
                    }

                    call.resolve([
                        "transactionId": String(transaction.id),
                        "productId": transaction.productID,
                        "receiptData": appReceipt,
                        "jwsTransaction": jwsRepresentation,
                        "originalTransactionId": String(transaction.originalID),
                    ])

                case .userCancelled:
                    call.reject("USER_CANCELLED", "User cancelled the purchase")

                case .pending:
                    call.resolve([
                        "pending": true,
                        "productId": productId,
                    ])

                @unknown default:
                    call.reject("Unknown purchase result")
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                try await AppStore.sync()

                var restoredTransactions: [[String: Any]] = []

                for await result in Transaction.currentEntitlements {
                    if let transaction = try? self.checkVerified(result) {
                        restoredTransactions.append([
                            "transactionId": String(transaction.id),
                            "productId": transaction.productID,
                            "originalTransactionId": String(transaction.originalID),
                        ])
                    }
                }

                call.resolve([
                    "success": true,
                    "transactions": restoredTransactions,
                    "restoredCount": restoredTransactions.count,
                ])
            } catch {
                call.reject("Restore failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func getReceipt(_ call: CAPPluginCall) {
        if let receiptURL = Bundle.main.appStoreReceiptURL,
           let receiptData = try? Data(contentsOf: receiptURL) {
            let base64Receipt = receiptData.base64EncodedString()
            call.resolve(["receiptData": base64Receipt])
        } else {
            call.resolve(["receiptData": ""])
        }
    }

    @objc func finishTransaction(_ call: CAPPluginCall) {
        guard let transactionIdStr = call.getString("transactionId"),
              let transactionId = UInt64(transactionIdStr) else {
            call.resolve(["success": true])
            return
        }

        Task { @MainActor in
            for await result in Transaction.unfinished {
                if let transaction = try? self.checkVerified(result),
                   transaction.id == transactionId {
                    await transaction.finish()
                    break
                }
            }
            call.resolve(["success": true])
        }
    }

    // MARK: - Private

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreKitError.failedVerification
        case .verified(let safe):
            return safe
        }
    }
}

enum StoreKitError: Error {
    case failedVerification
}
