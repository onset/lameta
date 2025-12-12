import { createTheme, Theme } from "@mui/material";

export const lameta_orange = "#e69664";
export const lameta_blue = "#becde4";
export const lameta_dark_blue = "#3D5E90";
export const lameta_green = "#cff09f";
export const lameta_dark_green = "#86cb20";
export const error_color = "#DC322F";
export const tooltipBackground = "#3D5E90";
export const searchHighlight = "#ffba8a";
export const languageSlotColors = ["#74A24E", "#3D5E90", "#8D6BC1", "#B84000"];
export const unknownLanguageColor = "#DC143C"; // Crimson red for unknown languages
export const unknownLanguageBackground = "rgba(220, 20, 60, 0.15)"; // Semi-transparent red background for unknown language slots
export const nonMetadataLanguageColor = lameta_orange; // Orange for known languages not in metadata slots

// lots of examples: https://github.com/search?q=createMuiTheme&type=Code
export function createLametaTheme(): Theme {
  return createTheme({
    palette: {
      primary: { main: lameta_dark_green },
      secondary: {
        // NB: if you change this to lameta_green, then we have to figure out how
        // to get the import checkboxes to go to a darker shade
        main: lameta_dark_green,
        contrastText: "white"
      },
      warning: { main: "#F3AA18" },
      info: { main: "#FFFF00" /* todo */ }
    },
    components: {
      MuiAlert: {
        styleOverrides: {
          standardWarning: {
            color: "#0c0c0ce1", // black with some transparency
            backgroundColor: "#f8ea2d",
            "& .MuiAlert-icon": {
              color: "#0c0c0ce1" // Your folder orange, keeps theme
            },
            "& .MuiAlert-icon svg": {
              width: "1.5em",
              height: "1.5em"
            }
          }
        }
      }
    }
  });
}

export function createProjectTheme(): Theme {
  return createTheme({
    palette: {
      primary: { main: "#f6dbcb" },
      secondary: {
        // NB: if you change this to lameta_green, then we have to figure out how
        // to get the import checkboxes to go to a darker shade
        main: lameta_orange,
        contrastText: "white"
      },
      warning: { main: "#F3AA18" },
      info: { main: "#f6dbcb" }
    },
    components: {
      MuiAlert: {
        styleOverrides: {
          standardWarning: {
            color: "#8B4513",
            backgroundColor: "#FFF8DC",
            "& .MuiAlert-icon": {
              color: "#B8860B"
            }
          }
        }
      }
    }
  });
}
