package com.warrescue.app.fragment;

import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.maps.CameraUpdateFactory;
import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.MapView;
import com.google.android.gms.maps.OnMapReadyCallback;
import com.google.android.gms.maps.model.BitmapDescriptorFactory;
import com.google.android.gms.maps.model.CircleOptions;
import com.google.android.gms.maps.model.LatLng;
import com.google.android.gms.maps.model.LatLngBounds;
import com.google.android.gms.maps.model.MapStyleOptions;
import com.google.android.gms.maps.model.MarkerOptions;

import com.warrescue.app.R;
import com.warrescue.app.model.Alert;
import com.warrescue.app.model.Shelter;
import com.warrescue.app.data.DataRepository;

import java.util.List;

public class MapFragment extends Fragment implements OnMapReadyCallback {

    private static final String TAG = "MapFragment";
    private MapView mapView;
    private GoogleMap googleMap;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_map, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        mapView = view.findViewById(R.id.mapView);

        // Check Google Play Services availability
        int gpsStatus = GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(requireContext());
        if (gpsStatus != ConnectionResult.SUCCESS) {
            String gpsErr = GoogleApiAvailability.getInstance().getErrorString(gpsStatus);
            Log.e(TAG, "Google Play Services not available: " + gpsErr + " (code=" + gpsStatus + ")");
            if (GoogleApiAvailability.getInstance().isUserResolvableError(gpsStatus)) {
                GoogleApiAvailability.getInstance().getErrorDialog(requireActivity(), gpsStatus, 9000).show();
            }
        } else {
            Log.d(TAG, "Google Play Services available");
        }

        // Verify API key at runtime
        try {
            String apiKey = getString(R.string.google_maps_api_key);
            if (apiKey == null || apiKey.isEmpty()) {
                Log.e(TAG, "Google Maps API key is EMPTY");
            } else {
                String masked = apiKey.substring(0, Math.min(8, apiKey.length())) + "...(" + apiKey.length() + " chars)";
                Log.d(TAG, "API key loaded: " + masked);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to read API key resource", e);
        }

        Log.d(TAG, "MapView: initializing...");
        mapView.onCreate(savedInstanceState);
        mapView.getMapAsync(this);
    }

    @Override
    public void onMapReady(@NonNull GoogleMap map) {
        this.googleMap = map;
        Log.d(TAG, "onMapReady: called OK");

        try {
            boolean success = map.setMapStyle(MapStyleOptions.loadRawResourceStyle(requireContext(), R.raw.map_style_dark));
            if (!success) {
                Log.w(TAG, "Dark map style parsing failed, using default style");
            } else {
                Log.d(TAG, "Map style: applied OK");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to load dark map style", e);
        }

        map.getUiSettings().setZoomControlsEnabled(true);
        map.getUiSettings().setCompassEnabled(true);
        map.getUiSettings().setMapToolbarEnabled(false);

        map.setOnMapLoadedCallback(() -> {
            Log.d(TAG, "Map tiles loaded successfully");
        });

        loadMarkers();
    }

    private void loadMarkers() {
        if (googleMap == null) return;

        DataRepository.getAlerts(requireContext(), new DataRepository.DataCallback<List<Alert>>() {
            @Override
            public void onData(List<Alert> alerts) {
                DataRepository.getShelters(requireContext(), new DataRepository.DataCallback<List<Shelter>>() {
                    @Override
                    public void onData(List<Shelter> shelters) {
                        renderMarkers(alerts, shelters);
                    }
                    @Override
                    public void onError(String error) {
                        renderMarkers(alerts, java.util.Collections.emptyList());
                    }
                });
            }
            @Override
            public void onError(String error) {
                DataRepository.getShelters(requireContext(), new DataRepository.DataCallback<List<Shelter>>() {
                    @Override
                    public void onData(List<Shelter> shelters) {
                        renderMarkers(java.util.Collections.emptyList(), shelters);
                    }
                    @Override
                    public void onError(String err) {
                        renderMarkers(java.util.Collections.emptyList(), java.util.Collections.emptyList());
                    }
                });
            }
        });
    }

    private void renderMarkers(List<Alert> alerts, List<Shelter> shelters) {
        if (googleMap == null) return;

        Log.d(TAG, "renderMarkers: " + alerts.size() + " alerts, " + shelters.size() + " shelters");

        LatLngBounds.Builder boundsBuilder = new LatLngBounds.Builder();
        boolean hasMarkers = false;

        for (Alert alert : alerts) {
            if (alert.getLatitude() == 0 && alert.getLongitude() == 0) continue;

            LatLng position = new LatLng(alert.getLatitude(), alert.getLongitude());
            boundsBuilder.include(position);
            hasMarkers = true;

            float hue = getAlertHue(alert.getSeverity());
            googleMap.addMarker(new MarkerOptions()
                    .position(position)
                    .title(alert.getTitle())
                    .snippet(alert.getCity() + " · " + alert.getAlertType() + " · " + alert.getReliabilityScore() + "%")
                    .icon(BitmapDescriptorFactory.defaultMarker(hue)));

            if ("red".equals(alert.getSeverity())) {
                googleMap.addCircle(new CircleOptions()
                        .center(position)
                        .radius(5000)
                        .strokeColor(Color.argb(150, 239, 68, 68))
                        .fillColor(Color.argb(40, 239, 68, 68))
                        .strokeWidth(2));
            } else if ("orange".equals(alert.getSeverity())) {
                googleMap.addCircle(new CircleOptions()
                        .center(position)
                        .radius(3000)
                        .strokeColor(Color.argb(150, 249, 115, 22))
                        .fillColor(Color.argb(30, 249, 115, 22))
                        .strokeWidth(2));
            }
        }

        for (Shelter shelter : shelters) {
            if (shelter.getLatitude() == 0 && shelter.getLongitude() == 0) continue;

            LatLng position = new LatLng(shelter.getLatitude(), shelter.getLongitude());
            boundsBuilder.include(position);
            hasMarkers = true;

            String status = shelter.getStatus();
            float hue = "open".equals(status) ? BitmapDescriptorFactory.HUE_GREEN :
                         "full".equals(status) ? BitmapDescriptorFactory.HUE_YELLOW :
                         BitmapDescriptorFactory.HUE_VIOLET;

            googleMap.addMarker(new MarkerOptions()
                    .position(position)
                    .title(shelter.getName())
                    .snippet(shelter.getAddress() + " · " + shelter.getCurrentOccupancy() + "/" + shelter.getCapacity())
                    .icon(BitmapDescriptorFactory.defaultMarker(hue)));
        }

        if (hasMarkers) {
            try {
                LatLngBounds bounds = boundsBuilder.build();
                googleMap.animateCamera(CameraUpdateFactory.newLatLngBounds(bounds, 100));
            } catch (Exception e) {
                googleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(new LatLng(50.4501, 30.5234), 5));
            }
        } else {
            googleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(new LatLng(50.4501, 30.5234), 5));
        }
    }

    private float getAlertHue(String severity) {
        if ("red".equals(severity)) return BitmapDescriptorFactory.HUE_RED;
        if ("orange".equals(severity)) return BitmapDescriptorFactory.HUE_ORANGE;
        if ("yellow".equals(severity)) return BitmapDescriptorFactory.HUE_YELLOW;
        return BitmapDescriptorFactory.HUE_AZURE;
    }

    @Override
    public void onResume() {
        super.onResume();
        if (mapView != null) mapView.onResume();
    }

    @Override
    public void onPause() {
        if (mapView != null) mapView.onPause();
        super.onPause();
    }

    @Override
    public void onDestroy() {
        if (mapView != null) mapView.onDestroy();
        super.onDestroy();
    }

    @Override
    public void onLowMemory() {
        super.onLowMemory();
        if (mapView != null) mapView.onLowMemory();
    }

    @Override
    public void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        if (mapView != null) mapView.onSaveInstanceState(outState);
    }
}
