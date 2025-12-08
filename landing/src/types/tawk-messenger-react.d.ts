declare module "@tawk.to/tawk-messenger-react" {
  import { Component } from "react";

  interface TawkMessengerReactProps {
    propertyId: string;
    widgetId: string;
  }

  export default class TawkMessengerReact extends Component<TawkMessengerReactProps> {}
}

