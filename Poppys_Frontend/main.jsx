import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./src/components/Layout"; /* Sidebar, Header, Footer */
import Login from "./src/screens/Login";
import Dashboard from "./src/screens/Dashboard";
import Machine from "./src/screens/Machine";
import Operator from "./src/screens/Operator";
import Line from "./src/screens/Line";
import Consolidated from "./src/screens/Consolidated";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/machine" element={<Machine />} />
          <Route path="/operator" element={<Operator />} />
          <Route path="/line" element={<Line />} />
          <Route path="/consolidated" element={<Consolidated />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);