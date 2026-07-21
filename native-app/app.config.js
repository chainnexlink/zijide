module.exports = ({ config }) => {
  const googleMapsKey = process.env.GOOGLE_MAPS_KEY || '';
  const plugins = (config.plugins || []).filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name !== 'expo-maps' && name !== 'react-native-maps';
  });

  return {
    ...config,
    plugins: [
      ...plugins,
      [
        'react-native-maps',
        {
          iosGoogleMapsApiKey: googleMapsKey,
          androidGoogleMapsApiKey: googleMapsKey,
        },
      ],
    ],
  };
};
