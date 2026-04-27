import React, { useState } from "react";
import "./styles.css";

const BOARD_ID = 18410416602;
const TARGET_GROUP_ID = "group_nmt2kbyj";

export default function App() {
  const [formData, setFormData] = useState({
    itemName: "",
    shift: "",
    dailyActivity: "",
    notes: "",
    startDate: "",
    dueDate: "",
    priority: ""
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const payload = {
        boardId: BOARD_ID,
        groupId: TARGET_GROUP_ID,
        itemName:
          formData.itemName ||
          `Daily Yard Report - ${new Date().toLocaleDateString()}`,

        columnValues: {
          text: formData.notes || "",
          status_1: { label: formData.dailyActivity || "" },
          status: { label: "Not Started" },
          date: formData.startDate
            ? { date: formData.startDate }
            : null,
          date4: formData.dueDate
            ? { date: formData.dueDate }
            : null
        }
      };

      const response = await fetch("/.netlify/functions/submit-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Submission failed");
      }

      setMessage("Daily Yard Report submitted successfully!");

      setFormData({
        itemName: "",
        shift: "",
        dailyActivity: "",
        notes: "",
        startDate: "",
        dueDate: "",
        priority: ""
      });
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Daily Yard Report</h1>

      <form onSubmit={handleSubmit} className="report-form">
        <label>
          Item Name
          <input
            type="text"
            name="itemName"
            value={formData.itemName}
            onChange={handleChange}
            placeholder="Example: Daily Yard Report - ESI"
          />
        </label>

        <label>
          Shift
          <input
            type="text"
            name="shift"
            value={formData.shift}
            onChange={handleChange}
            placeholder="Day / Night"
          />
        </label>

        <label>
          Daily Activity
          <select
            name="dailyActivity"
            value={formData.dailyActivity}
            onChange={handleChange}
            required
          >
            <option value="">Select Activity</option>
            <option value="Erect">Erect</option>
            <option value="Dismantle">Dismantle</option>
            <option value="Modify">Modify</option>
          </select>
        </label>

        <label>
          Notes / Text Field
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Enter job notes here..."
            rows="5"
          />
        </label>

        <label>
          Start Date
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
          />
        </label>

        <label>
          Due Date
          <input
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Report"}
        </button>
      </form>

      {message && <p className="message">{message}</p>}
    </div>
  );
}
