import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE, type MapType } from 'react-native-maps';

export type MapPoint = { id: string; latitude: number; longitude: number; title?: string; description?: string; color?: string };
type Props = {
  center: { latitude: number; longitude: number };
  markers?: MapPoint[];
  radiusMeters?: number;
  radiusColor?: string;
  route?: Array<{ latitude: number; longitude: number }>;
  mapType?: MapType;
  showsUserLocation?: boolean;
  zoom?: number;
};

export function NativeGoogleMap({ center, markers = [], radiusMeters, radiusColor = '#EF4444', route = [], mapType, showsUserLocation = false, zoom = 0.08 }: Props) {
  const ref = useRef<MapView>(null);
  const [savedMapType, setSavedMapType] = useState<MapType>('standard');
  const region = useMemo(() => ({ ...center, latitudeDelta: zoom, longitudeDelta: zoom }), [center, zoom]);
  useEffect(() => { void AsyncStorage.getItem('map-preferences').then((value) => { if (!value) return; const type = JSON.parse(value)?.map_type; if (['standard', 'satellite', 'hybrid', 'terrain'].includes(type)) setSavedMapType(type); }).catch(() => undefined); }, []);
  useEffect(() => { ref.current?.animateToRegion(region, 400); }, [region]);
  return <View style={styles.wrap}>
    <MapView ref={ref} provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill} initialRegion={region} mapType={mapType || savedMapType} showsUserLocation={showsUserLocation} showsMyLocationButton showsCompass toolbarEnabled={false}>
      {markers.map((marker) => <Marker key={marker.id} coordinate={marker} title={marker.title} description={marker.description} pinColor={marker.color || '#EF4444'} />)}
      {radiusMeters ? <Circle center={center} radius={radiusMeters} fillColor={`${radiusColor}22`} strokeColor={radiusColor} strokeWidth={2} /> : null}
      {route.length > 1 ? <Polyline coordinates={route} strokeColor="#38BDF8" strokeWidth={5} /> : null}
    </MapView>
  </View>;
}

const styles = StyleSheet.create({ wrap: { height: 240, overflow: 'hidden', borderRadius: 18, backgroundColor: '#0D2031' } });
