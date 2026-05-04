import Foundation
import Capacitor
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
    private var updateListenerTask: Task<Void, Error>? = nil

    override public func load() {
        updateListenerTask = listenForTransactions()
    }

    deinit {
        updateListenerTask?.cancel()
    }

    // Listen for transaction updates (renewals, revocations, etc.)
    private func listenForTransactions() -> Task<Void, Error> {
        return Task.detached {
            for await result in Transaction.updates {
                do {
                    let transaction = try self.checkVerified(result)
                    await transaction.finish()
                } catch {
                    print("Transaction verification failed: \(error)")
                }
            }
        }
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreError.failedVerification
        case .verified(let safe):
            return safe
        }
    }

    // MARK: - Plugin Methods

    @objc func initialize(_ call: CAPPluginCall) {
        call.resolve(["success": true])
    }

    @objc func getProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds", String.self) else {
            call.reject("productIds is required")
            return
        }

        Task {
            do {
                let storeProducts = try await Product.products(for: Set(productIds))
                var productList: [[String: Any]] = []

                for product in storeProducts {
                    self.products[product.id] = product
                    let productInfo: [String: Any] = [
                        "productId": product.id,
                        "title": product.displayName,
                        "description": product.description,
                        "price": product.displayPrice,
                        "priceValue": NSDecimalNumber(decimal: product.price).doubleValue,
                        "currencyCode": product.priceFormatStyle.currencyCode,
                    ]
                    productList.append(productInfo)
                }

                call.resolve(["products": productList])
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

        Task {
            do {
                guard let product = self.products[productId] ?? (try? await Product.products(for: [productId]))?.first else {
                    call.reject("Product not found: \(productId)")
                    return
                }

                let result = try await product.purchase()

                switch result {
                case .success(let verification):
                    let transaction = try self.checkVerified(verification)

                    // Get the receipt/JWS for server verification
                    let jwsRepresentation = verification.jwsRepresentation

                    call.resolve([
                        "transactionId": String(transaction.id),
                        "productId": transaction.productID,
                        "receiptData": jwsRepresentation,
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
        Task {
            do {
                try await AppStore.sync()

                var restoredTransactions: [[String: Any]] = []

                for await result in Transaction.currentEntitlements {
                    do {
                        let transaction = try self.checkVerified(result)
                        restoredTransactions.append([
                            "transactionId": String(transaction.id),
                            "productId": transaction.productID,
                            "originalTransactionId": String(transaction.originalID),
                        ])
                    } catch {
                        continue
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
        // In StoreKit 2, we use JWS tokens per-transaction instead of a single receipt
        // Return the app store receipt URL data for legacy verification
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

        Task {
            // Find and finish the transaction
            for await result in Transaction.unfinished {
                do {
                    let transaction = try self.checkVerified(result)
                    if transaction.id == transactionId {
                        await transaction.finish()
                        break
                    }
                } catch {
                    continue
                }
            }
            call.resolve(["success": true])
        }
    }
}

// Custom error enum
enum StoreError: Error {
    case failedVerification
}
