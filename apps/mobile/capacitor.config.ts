import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cadernim.app",
  appName: "Cadernim",
  webDir: "www",
  server: {
    url: "https://cadernim.com.br",
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#f5f1ea",
      androidSplashResourceName: "splash",
      showSpinner: false,
      androidScaleType: "CENTER_CROP"
    },
    StatusBar: {
      style: "Dark",
      backgroundColor: "#3a5a40"
    }
  }
};

export default config;
