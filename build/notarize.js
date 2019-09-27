// notarize the mac version

// to test notarization by hand, do something like:
xcrun altool --verbose --notarize-app -f "SayMore X-0.7.5-mac.zip" --primary-bundle-id "io.github.saymore.saymore-x" -u "<your apple id>" -p "@keychain:altool.pw"
// Review: what's the actual best version of this to be notarizing? The Zip? The raw app?

const { notarize } = require("electron-notarize");

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  const params = {
    appBundleId: "io.github.saymore.saymore-x",
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLEID,
    // this is an app-specific password you get from appid.apple.com, then put that value in "altool.pw" 
    // in the keychain. I named mine "altoo.pw" because if you do this by hand, that's the tool you're talking to.
    appleIdPassword: "@keychain:altool.pw"
  };
  console.log(`notarize(${JSON.stringify(params)})`);
  return await notarize(params);
};
