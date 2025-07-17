import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./src/screens/Login";
import Dashboard from "./src/screens/Dashboard";
import Machine from "./src/screens/Machine";
import Layout from "./src/components/Layout";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/machine" element={<Machine />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);