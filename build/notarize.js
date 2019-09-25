// notarize the mac version

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
    appleIdPassword: process.env.APPLEIDPASS
  };
  console.log(`notarize(${JSON.stringify(params)})`);
  return await notarize(params);
};
