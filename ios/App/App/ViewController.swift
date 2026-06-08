import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        NSLog("WR_DIAG viewDidLoad-begin")
        super.viewDidLoad()
        let idx = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "public")
        NSLog("WR_DIAG bundle public/index.html = %@", idx?.path ?? "NOT-FOUND")
        NSLog("WR_DIAG after super: webView=%@ viewSubviews=%d viewFrame=%@",
              self.webView != nil ? "exists" : "NIL",
              self.view.subviews.count,
              NSCoder.string(for: self.view.frame))
        DispatchQueue.main.asyncAfter(deadline: .now() + 6) {
            if let wv = self.webView {
                NSLog("WR_DIAG +6s webView url=%@ frame=%@ loading=%@ hidden=%@ alpha=%f superview=%@",
                      String(describing: wv.url),
                      NSCoder.string(for: wv.frame),
                      wv.isLoading ? "Y" : "N",
                      wv.isHidden ? "Y" : "N",
                      wv.alpha,
                      wv.superview != nil ? "yes" : "NIL")
            } else {
                NSLog("WR_DIAG +6s webView STILL NIL")
            }
        }
    }

    override open func capacitorDidLoad() {
        NSLog("WR_DIAG capacitorDidLoad")
        bridge?.registerPluginInstance(InAppPurchasePlugin())
    }
}
