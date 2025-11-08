import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pulacatraca.app',
  appName: 'Pula Catraca',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
