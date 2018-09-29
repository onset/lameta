const XPATH = require("xpath");
const dom = require("xmldom").DOMParser;
let resultXml: string;
let resultDom: any;

export function setResultXml(xml: string) {
  resultXml = xml;
  resultDom = new dom().parseFromString(resultXml);
}

export function assertAttribute(
  xpath: string,
  attribute: string,
  expected: string
) {
  const hits = select(xpath);
  if (!hits || hits.length === 0) {
    console.log(resultXml);
    return {
      message: () => `expected ${xpath} to exist `,
      pass: false
    };
  }
  const xpathWithAttr = xpath + `[@${attribute}="${expected}"]`;
  const pass = select(xpathWithAttr).length > 0;
  if (pass) {
    return {
      message: () =>
        `expected ${xpathWithAttr} ${attribute} to be ${expected}. `,
      pass: true
    };
  } else {
    return {
      message: () =>
        `expected ${xpathWithAttr} ${attribute} to be ${expected}. `,
      pass: false
    };
  }
}

export function count(xpath: string): number {
  return select(xpath).length;
}
export function value(xpath: string): string {
  return select(xpath)[0].textContent;
}
export function select(xpath: string) {
  try {
    const nodes = XPATH.selectWithResolver(
      xpath,
      resultDom
      //, resolver
    );
    return nodes;
  } catch (ex) {
    console.log("error in xpath: " + xpath);
    console.log(ex);
    throw new Error(`error in xpath: ${xpath} ${ex}`);
  }
}

/* I was trying to not have to include a ns prefix in the tests,
  but this isn't called unless I give it some namespace, so what's the point?

  const resolver = {
  lookupNamespaceURI: (prefix: string) => {
    return "http://www.mpi.nl/IMDI/Schema/IMDI";
  }
};*/

// I haven't figured out to extend
// to novel names properly.
export const xexpect = expect as any;

// This overrides an existing expect function in order to have a convenient
// check using an xpath and an expected value.
expect.extend({
  toMatch(xpath, expectedValue) {
    const hits = select(xpath);
    if (!hits || hits.length === 0) {
      console.log(resultXml);
      return {
        message: () =>
          `expected ${xpath} to be '${expectedValue}' but it did not match anything`,
        pass: false
      };
    }
    const pass = value(xpath) === expectedValue;
    if (pass) {
      return {
        message: () => `expected ${xpath} to be '${expectedValue}'`,
        pass: true
      };
    } else {
      console.log(resultXml);
      return {
        message: () => `expected ${xpath} to be '${expectedValue}'`,
        pass: false
      };
    }
  }
});

expect.extend({
  toHaveCount(xpath, expectedValue) {
    const matchCount = select(xpath).length;
    if (matchCount !== expectedValue) {
      console.log(resultXml);
      return {
        message: () =>
          `expected ${xpath} to have ${expectedValue} matches, but got ${matchCount}`,
        pass: false
      };
    }

    return {
      message: () => `expected ${xpath} to have ${expectedValue} matches`,
      pass: true
    };
  }
});

expect.extend({
  toDeclareVocabulary(xpath, url) {
    const hits = select(xpath);
    if (!hits || hits.length === 0) {
      console.log(resultXml);
      return {
        message: () =>
          `expected ${xpath} to be '${url}' but it did not match anything`,
        pass: false
      };
    }
    const xpathWithAttr = xpath + `[@Link="${url}"]`;
    const pass = select(xpathWithAttr).length > 0;
    if (pass) {
      return {
        message: () => `expected ${xpathWithAttr} Link to be '${url}'`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${xpathWithAttr} Link to be '${url}'\r\n`,
        pass: false
      };
    }
  }
});

expect.extend({
  toBeClosed(xpath) {
    const hits = select(xpath);
    if (!hits || hits.length === 0) {
      console.log(resultXml);
      return {
        message: () => `expected ${xpath} to be exist`,
        pass: false
      };
    }
    const xpathWithAttr = xpath + `[@Type="ClosedVocabulary"]`;
    const pass = select(xpathWithAttr).length > 0;
    if (pass) {
      return {
        message: () => `expected ${xpathWithAttr} type to be closed}'`,
        pass: true
      };
    } else {
      return {
        message: () =>
          `expected ${xpathWithAttr} Link to be type to be closed. `,
        pass: false
      };
    }
  }
});

expect.extend({
  toBeOpen(xpath) {
    return assertAttribute(xpath, "Type", "OpenVocabulary");
  }
});
expect.extend({
  toHaveAttributeValue(xpath, attributeName, attributeValue) {
    return assertAttribute(xpath, attributeName, attributeValue);
  }
});
expect.extend({
  toHaveText(xpath, text) {
    if (value(xpath) === text) {
      return {
        message: () => "",
        pass: true
      };
    } else {
      return {
        message: () =>
          `expected ${xpath}, which is "${value(xpath)}", to equal "${text}".`,
        pass: false
      };
    }
  }
});
