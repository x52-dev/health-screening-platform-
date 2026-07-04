import { render } from "preact";
import { App } from "./app.jsx";

// This tells Preact to take our App and inject it into the HTML screen
render(<App />, document.getElementById("app"));
