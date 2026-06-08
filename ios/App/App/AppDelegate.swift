import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Force-reference classes that are otherwise only referenced by NAME (storyboard /
        // Info.plist). Without this the linker strips them, causing
        // "Unknown class _TtC3App14ViewController in Interface Builder file" at runtime ->
        // the storyboard substitutes a plain black UIViewController (no WKWebView) -> black screen.
        _ = InAppPurchasePlugin.self
        _ = ViewController.self
        return true
    }

    // MARK: UIScene lifecycle (required when built with the iOS 26 SDK)
    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    // MARK: Process-level lifecycle
    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

// MARK: - SceneDelegate
// iOS 26 SDK builds require the UIScene life cycle. This delegate programmatically
// creates the window and instantiates Main.storyboard's initial view controller
// (ViewController: CAPBridgeViewController), which loads the Capacitor WKWebView.
// Programmatic creation avoids any ambiguity between UIMainStoryboardFile /
// UISceneStoryboardFile and the scene window.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        // Load Main.storyboard's initial VC (ViewController: CAPBridgeViewController) on its
        // standard init path. ViewController is force-referenced in AppDelegate so the linker
        // keeps it and the by-name lookup resolves (previously stripped => "Unknown class
        // ...ViewController" => plain black UIViewController). Programmatic ViewController()
        // crashed at launch, so we use the storyboard path here.
        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        window.rootViewController = storyboard.instantiateInitialViewController()
        self.window = window
        window.makeKeyAndVisible()

        if let urlContext = connectionOptions.urlContexts.first {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: urlContext.url, options: [:])
        }
        if let userActivity = connectionOptions.userActivities.first {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity) { _ in }
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity) { _ in }
    }
}
