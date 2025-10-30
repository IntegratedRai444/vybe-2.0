import { Theme as MuiTheme } from '@mui/material/styles';

declare module '@emotion/react' {
  export interface Theme extends MuiTheme {
    palette: {
      mode: 'light' | 'dark';
      primary: {
        main: string;
        light: string;
        dark: string;
        contrastText: string;
      };
      secondary: {
        main: string;
        light: string;
        dark: string;
        contrastText: string;
      };
      background: {
        default: string;
        paper: string;
      };
      text: {
        primary: string;
        secondary: string;
        disabled: string;
      };
      action: {
        active: string;
        hover: string;
        selected: string;
        disabled: string;
        disabledBackground: string;
      };
      divider: string;
    };
    spacing: (factor: number) => string;
  }
}
