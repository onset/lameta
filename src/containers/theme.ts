import { createTheme, Theme } from "@mui/material";

export const lameta_orange = "#e69664";
export const lameta_blue = "#becde4";
export const lameta_green = "#cff09f";
export const lameta_dark_green = "#86cb20";
export const error_color = "#DC322F";
export const tooltipBackground = "#3D5E90";

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
