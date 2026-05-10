package com.warrescue.app;

import android.app.Application;
import android.content.Context;

import com.warrescue.app.util.LocaleHelper;

public class WarRescueApplication extends Application {

    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(LocaleHelper.onAttach(base));
    }
}
