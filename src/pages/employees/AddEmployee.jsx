import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { jsPDF } from "jspdf";

const AddEmployee = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: "", email: "", role: "", department: "", startDate: "", status: "Active"
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // Generate PDF contract on the fly
  const buildContract = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Employment Contract", 20, 20);
    doc.setFontSize(12);
    doc.text(`Name: ${form.name}`, 20, 40);
    doc.text(`Role: ${form.role}`, 20, 50);
    doc.text(`Department: ${form.department}`, 20, 60);
    doc.text(`Start Date: ${form.startDate}`, 20, 70);
    doc.text("…other terms here…", 20, 90);
    return doc.output("blob");
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setMsg({});

    try {
      const contractBlob = buildContract();
      const data = new FormData();
      Object.entries(form).forEach(([k,v]) => data.append(k, v));
      data.append("contract", contractBlob, "contract.pdf");

      const res = await fetch("https://hr-backend-npbd.onrender.com/api/employees", {
        method: "POST",
        body: data
      });
      if (!res.ok) throw new Error(await res.text());

      setForm({ name:"", email:"", role:"", department:"", startDate:"", status:"Active" });
      setMsg({ type: "success", text: t("addEmployee.success") });
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: t("addEmployee.error") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 mx-auto max-w-lg">
      <h2 className="text-2xl font-bold mb-4">{t("addEmployee.title")}</h2>
      {msg.text && (
        <div className={msg.type==="error" ? "text-red-600" : "text-green-600"}>
          {msg.text}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">
        {["name","email","role","department","startDate"].map(field => (
          <div key={field}>
            <label className="block mb-1">{t(`addEmployee.${field}`)}</label>
            <input
              name={field}
              type={field==="email"?"email":field==="startDate"?"date":"text"}
              value={form[field]}
              onChange={handleChange}
              required
              className="w-full border px-3 py-2 rounded focus:outline-none focus:ring"
            />
          </div>
        ))}
        <div>
          <label className="block mb-1">{t("addEmployee.status")}</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="Active">{t("addEmployee.statusActive")}</option>
            <option value="Inactive">{t("addEmployee.statusInactive")}</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
        >
          {submitting ? t("addEmployee.submitting") : t("addEmployee.submit")}
        </button>
      </form>
    </div>
  );
};

export default AddEmployee;
