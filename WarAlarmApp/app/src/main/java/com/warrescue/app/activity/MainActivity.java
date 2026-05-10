package com.warrescue.app.activity;

import android.content.Context;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.warrescue.app.R;
import com.warrescue.app.fragment.DashboardFragment;
import com.warrescue.app.fragment.FamilyFragment;
import com.warrescue.app.fragment.MapFragment;
import com.warrescue.app.fragment.SettingsFragment;
import com.warrescue.app.fragment.SosFragment;
import com.warrescue.app.util.LocaleHelper;

public class MainActivity extends AppCompatActivity {

    public static final String EXTRA_NAV_TAB = "nav_tab";
    public static final String TAB_SETTINGS = "settings";

    private BottomNavigationView bottomNav;

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(LocaleHelper.onAttach(newBase));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        bottomNav = findViewById(R.id.bottomNav);
        setupBottomNavigation();

        // Load default fragment or navigate to requested tab
        if (savedInstanceState == null) {
            String navTab = getIntent().getStringExtra(EXTRA_NAV_TAB);
            if (TAB_SETTINGS.equals(navTab)) {
                bottomNav.setSelectedItemId(R.id.nav_settings);
            } else {
                loadFragment(new DashboardFragment());
            }
        }
    }

    private void setupBottomNavigation() {
        bottomNav.setOnItemSelectedListener(item -> {
            Fragment fragment = null;
            int itemId = item.getItemId();

            if (itemId == R.id.nav_home) {
                fragment = new DashboardFragment();
            } else if (itemId == R.id.nav_map) {
                fragment = new MapFragment();
            } else if (itemId == R.id.nav_sos) {
                fragment = new SosFragment();
            } else if (itemId == R.id.nav_family) {
                fragment = new FamilyFragment();
            } else if (itemId == R.id.nav_settings) {
                fragment = new SettingsFragment();
            }

            if (fragment != null) {
                loadFragment(fragment);
                return true;
            }
            return false;
        });
    }

    private void loadFragment(Fragment fragment) {
        getSupportFragmentManager()
                .beginTransaction()
                .replace(R.id.fragmentContainer, fragment)
                .commit();
    }
}
