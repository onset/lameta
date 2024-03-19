import fs from "fs";
import { IFolderType } from "../Folder/Folder";
import { FieldDefinition } from "./FieldDefinition";
import JSON5 from "json5";
import jsonOfDefaultFieldConfig from "../../../archive-configurations/lameta/fields.json5?raw";
import { locateDependencyForFilesystemCall } from "../../other/locateDependency";
import { NotifyError, NotifyNoBigDeal } from "../../components/Notify";

type FieldDefinitionCatalog = {
  project: FieldDefinition[];
  session: FieldDefinition[];
  person: FieldDefinition[];
};
const catalogOfAllAvailableKnownFields: FieldDefinitionCatalog = JSON5.parse(
  jsonOfDefaultFieldConfig
);
// for each field definition, if does not explicity set multilingual, set it to false
for (const area of ["project", "session", "person"]) {
  for (const field of catalogOfAllAvailableKnownFields[area]) {
    if (field.multilingual === undefined) {
      field.multilingual = false;
    }
  }
}
export function getFieldDefinition(
  folderType: IFolderType,
  key: string
): FieldDefinition {
  return fieldDefinitionsOfCurrentConfig[folderType].find(
    (d: any) => d.key.toLowerCase() === key.toLowerCase() || d.xmlTag === key
  );
}
export function isKnownFieldKey(key: string): boolean {
  return Object.keys(fieldDefinitionsOfCurrentConfig).some(
    (
      area // e.g. project, session, person
    ) =>
      fieldDefinitionsOfCurrentConfig[area].find(
        (d: any) =>
          d.key.toLowerCase() === key.toLowerCase() || d.xmlTag === key
      )
  );
}

const countries = [
  "unspecified",
  "Afghanistan",
  "Albania",
  "Algeria",
  "American Samoa",
  "Andorra",
  "Angola",
  "Anguilla",
  "Antarctica",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Aruba",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bermuda",
  "Bhutan",
  "Bolivia, Plurinational State of",
  "Bonaire, Sint Eustatius and Saba",
  "Bosnia and Herzegovina",
  "Botswana",
  "Bouvet Island",
  "Brazil",
  "British Indian Ocean Territory",
  "Brunei Darussalam",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Cape Verde",
  "Cayman Islands",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Christmas Island",
  "Cocos (Keeling) Islands",
  "Colombia",
  "Comoros",
  "Congo",
  "Congo, the Democratic Republic of the",
  "Cook Islands",
  "Costa Rica",
  "Cote D'Ivoire",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Ethiopia",
  "Falkland Islands (Malvinas)",
  "Faroe Islands",
  "Fiji",
  "Finland",
  "France",
  "French Guiana",
  "French Polynesia",
  "French Southern Territories",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Gibraltar",
  "Greece",
  "Greenland",
  "Grenada",
  "Guadeloupe",
  "Guam",
  "Guatemala",
  "Guernsey",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Heard Island and McDonald Islands",
  "Holy See (Vatican City State)",
  "Honduras",
  "Hong Kong",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran, Islamic Republic of",
  "Iraq",
  "Ireland",
  "Isle of Man",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jersey",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Korea, Democratic People\\'s Republic of",
  "Korea, Republic of",
  "Kuwait",
  "Kyrgyzstan",
  "Lao People\\'s Democratic Republic",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Macao",
  "Macedonia, the Former Yugoslav Republic of",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Martinique",
  "Mauritania",
  "Mauritius",
  "Mayotte",
  "Mexico",
  "Micronesia, Federated States of",
  "Moldova, Republic of",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Montserrat",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Caledonia",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Niue",
  "Norfolk Island",
  "Northern Mariana Islands",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine, State of",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Pitcairn",
  "Poland",
  "Portugal",
  "Puerto Rico",
  "Qatar",
  "RÃ©union",
  "Romania",
  "Russian Federation",
  "Rwanda",
  "Saint Helena, Ascension and Tristan da Cunha",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Martin (French part)",
  "Saint Pierre and Miquelon",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Sint Maarten (Dutch part)",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Georgia and the South Sandwich Islands",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Svalbard and Jan Mayen",
  "Swaziland",
  "Sweden",
  "Switzerland",
  "Syrian Arab Republic",
  "Taiwan, Province of China",
  "Tajikistan",
  "Tanzania, United Republic of",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tokelau",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Turks and Caicos Islands",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "United States Minor Outlying Islands",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Venezuela, Bolivarian Republic of",
  "Viet Nam",
  "Virgin Islands, British",
  "Virgin Islands, U.S.",
  "Wallis and Futuna",
  "Western Sahara",
  "Yemen",
  "Zambia",
  "Zimbabwe"
];

catalogOfAllAvailableKnownFields.project.find(
  (d) => d.imdiRange === "http://www.mpi.nl/IMDI/Schema/Countries.xml"
)!.choices = countries;
catalogOfAllAvailableKnownFields.session.find(
  (d) => d.imdiRange === "http://www.mpi.nl/IMDI/Schema/Countries.xml"
)!.choices = countries;

// we can't use the full definition becuase we want every field to be optional
type FieldDefinitionCustomization = {
  key: string;
  // allow any other fields
  [x: string]: any;
};

type FieldDefinitionCustomizationCatalog = {
  project?: FieldDefinitionCustomization[];
  session?: FieldDefinitionCustomization[];
  person?: FieldDefinitionCustomization[];
};
// exported for unit test use
export function computeMergedCatalog(
  catalogOfConfiguration: FieldDefinitionCustomizationCatalog
): FieldDefinitionCatalog {
  const mergedCatalog: FieldDefinitionCatalog = {
    project: [],
    session: [],
    person: []
  };
  for (const area of ["project", "session", "person"]) {
    // check for any keys that aren't in the official catalog, and throw an error
    if (catalogOfConfiguration[area]) {
      for (const customization of catalogOfConfiguration[area]) {
        if (
          catalogOfAllAvailableKnownFields[area].find(
            (f) => f.key === customization.key
          ) === undefined
        ) {
          throw new Error(
            `The custom catalog has an entry with key:"${customization.key}", but that is not found in the official catalog. We don't currently support adding unknown fields.`
          );
        }
      }
    }

    mergedCatalog[area] = catalogOfAllAvailableKnownFields[area].map(
      (def: any) => {
        if (catalogOfConfiguration[area]) {
          const entry = catalogOfConfiguration[area].find(
            (d) => d.key == def.key
          );
          if (entry) {
            // merge the properties of the choice into the field definition, overriding the defaults
            const m = { ...def, ...entry };
            return m;
          }
        }
        return def;
      }
    );
  }
  return mergedCatalog;
}
function loadFieldChoices(configurationName: string) {
  const path = locateDependencyForFilesystemCall(
    `archive-configurations/${configurationName}`
  );
  if (configurationName === "default") {
    return computeMergedCatalog({});
  }
  if (!fs.existsSync(path)) {
    NotifyNoBigDeal(
      `This version of lameta does not have a field configuration for ${configurationName}.`
    );
    // throw new Error(`The file ${path} does not exist.`);
    return computeMergedCatalog({});
  }

  const fieldsPath = path + "/fields.json5";
  if (!fs.existsSync(fieldsPath)) {
    return computeMergedCatalog({});
  } else {
    const fieldChoicesText = fs.readFileSync(fieldsPath, "utf8");
    const fieldChoices = JSON5.parse(fieldChoicesText);
    return computeMergedCatalog(fieldChoices);
  }
}

const fieldDefinitionsOfCurrentConfig: FieldDefinitionCatalog = {
  project: [],
  session: [],
  person: []
};
export function prepareGlobalFieldDefinitionCatalog(configurationName: string) {
  const x = makeFieldDefinitionCatalog(configurationName);
  // copy the contents of x into fieldDefinitionsOfCurrentConfig without
  // changing the identify of fieldDefinitionsOfCurrentConfig, because only
  // the original object is exported.
  Object.assign(fieldDefinitionsOfCurrentConfig, x);
}
export function makeFieldDefinitionCatalog(
  configurationName: string
): FieldDefinitionCatalog {
  return loadFieldChoices(configurationName);
}
// todo: move to Project?
export { fieldDefinitionsOfCurrentConfig }; // does not include custom fields
