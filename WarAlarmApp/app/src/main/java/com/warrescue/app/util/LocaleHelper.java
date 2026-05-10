package com.warrescue.app.util;

import android.content.Context;
import android.content.res.Configuration;
import android.content.res.Resources;

import java.util.Locale;

/**
 * Helper for changing app locale at runtime.
 * Supports 9 languages: zh, en, uk, ar, iw(he), fr, es, ru, tr
 */
public class LocaleHelper {

    private static boolean isUpdating = false;

    public static Context setLocale(Context context, String language) {
        return updateResources(context, language);
    }

    public static Context onAttach(Context context) {
        SessionManager sm = new SessionManager(context);
        String lang = sm.getLanguage();
        return setLocale(context, lang);
    }

    @SuppressWarnings("deprecation")
    private static Context updateResources(Context context, String language) {
        if (isUpdating) {
            return context;
        }
        isUpdating = true;
        try {
            Locale locale = new Locale(language);
            Locale.setDefault(locale);

            Resources res = context.getResources();
            Configuration config = new Configuration(res.getConfiguration());
            config.setLocale(locale);

            // Update Resources directly so XML-inflated layouts pick up new locale
            res.updateConfiguration(config, res.getDisplayMetrics());

            return context.createConfigurationContext(config);
        } finally {
            isUpdating = false;
        }
    }

    public static String getLanguageDisplayName(String code) {
        switch (code) {
            case "zh": return "\u7b80\u4f53\u4e2d\u6587";
            case "en": return "English";
            case "uk": return "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430";
            case "ar": return "\u0627\u0644\u0639\u0631\u0628\u064a\u0629";
            case "iw":
            case "he": return "\u05e2\u05d1\u05e8\u05d9\u05ea";
            case "fr": return "Fran\u00e7ais";
            case "es": return "Espa\u00f1ol";
            case "ru": return "\u0420\u0443\u0441\u0441\u043a\u0438\u0439";
            case "tr": return "T\u00fcrk\u00e7e";
            default: return code;
        }
    }

    public static String[] getSupportedLanguages() {
        return new String[]{"zh", "en", "uk", "ar", "iw", "fr", "es", "ru", "tr"};
    }

    public static String[] getSupportedLanguageNames() {
        return new String[]{
            "\u7b80\u4f53\u4e2d\u6587", "English", "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430",
            "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", "\u05e2\u05d1\u05e8\u05d9\u05ea", "Fran\u00e7ais",
            "Espa\u00f1ol", "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", "T\u00fcrk\u00e7e"
        };
    }
}
