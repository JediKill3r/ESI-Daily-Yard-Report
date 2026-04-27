import React, { useEffect, useState } from 'react';

const BOARD_ID = 18410416602;
const TARGET_GROUP_ID = 'new_group18410416602';

function blankActivity() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: '',
    description: '',
  };
}

async function submitToMonday({ itemName, columnValues, groupId }) {
  const response = await fetch('/api/submit-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      boardId: BOARD_ID,
      groupId,
      itemName,
      columnValues,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to create item in Monday.');
  }

  return result;
}

function Field({ label, error, children, full = false }) {
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      <label>{label}</label>
      {children}
      {error ? <div className="error">{error}</div> : null}
    </div>
  );
}

export default function App() {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    location: '',
    jobNumber: '',
    costCode: '',
    foreman: '',
    workerCount: '',
    totalHours: '',
    weather: '',
    delaysIssues: '',
    safetyNotes: '',
    materialsEquipment: '',
  });

  const [activities, setActivities] = useState([blankActivity()]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(''), 4000);
    return () => window.clearTimeout(timer);
  }, [success]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const addActivity = () => {
    setActivities((prev) => [...prev, blankActivity()]);
  };

  const removeActivity = (id) => {
    setActivities((prev) => prev.filter((activity) => activity.id !== id));
  };

  const updateActivity = (id, field, value) => {
    setActivities((prev) =>
      prev.map((activity) => (activity.id === id ? { ...activity, [field]: value } : activity))
    );
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.date) errors.date = 'Date is required';
    if (!formData.location.trim()) errors.location = 'Location is required';
    if (!formData.jobNumber.trim()) errors.jobNumber = 'Job Number is required';
    if (!formData.costCode.trim()) errors.costCode = 'Cost Code is required';
    if (!formData.foreman.trim()) errors.foreman = 'Foreman is required';

    if (!formData.workerCount || Number(formData.workerCount) < 0) {
      errors.workerCount = 'Worker Count is required';
    }

    if (!formData.totalHours || Number(formData.totalHours) <= 0) {
      errors.totalHours = 'Total hours must be greater than 0';
    }

    const validActivities = activities.filter(
      (activity) => activity.time.trim() || activity.description.trim()
    );

    if (validActivities.length === 0) {
      errors.activities = 'Add at least one activity';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildSummary = () => {
    const summaryParts = [
      formData.location ? `Location: ${formData.location}` : '',
      formData.jobNumber ? `Job#: ${formData.jobNumber}` : '',
      formData.costCode ? `Cost Code: ${formData.costCode}` : '',
      formData.foreman ? `Foreman: ${formData.foreman}` : '',
      formData.workerCount ? `Workers: ${formData.workerCount}` : '',
      formData.totalHours ? `Total Hours: ${formData.totalHours}` : '',
      formData.weather ? `Weather: ${formData.weather}` : '',
    ].filter(Boolean);

    return summaryParts.join(' | ');
  };

  const buildActivityLog = () => {
    return activities
      .filter((activity) => activity.time.trim() || activity.description.trim())
      .map((activity) => `• ${activity.time ? `${activity.time} - ` : ''}${activity.description}`)
      .join('\n');
  };

  const buildDetailedNotes = () => {
    const sections = [
      'DELAYS / ISSUES',
      formData.delaysIssues || 'None',
      '',
      'SAFETY NOTES',
      formData.safetyNotes || 'None',
      '',
      'MATERIALS / EQUIPMENT',
      formData.materialsEquipment || 'None',
    ];

    return sections.join('\n');
  };

  const buildFullTextReport = () => {
    return [
      buildSummary(),
      '',
      'DAILY ACTIVITIES',
      buildActivityLog() || 'None',
      '',
      buildDetailedNotes(),
      '',
      `Job Number: ${formData.jobNumber}`,
      `Cost Code: ${formData.costCode}`,
      `Worker Count: ${formData.workerCount}`,
      `Total Hours: ${formData.totalHours}`,
      `Weather: ${formData.weather || 'None'}`,
    ].join('\n');
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      location: '',
      jobNumber: '',
      costCode: '',
      foreman: '',
      workerCount: '',
      totalHours: '',
      weather: '',
      delaysIssues: '',
      safetyNotes: '',
      materialsEquipment: '',
    });
    setActivities([blankActivity()]);
    setValidationErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const reportTitle = `Daily Yard Report - ${formData.location} - ${new Date(
        formData.date
      ).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })}`;

      await submitToMonday({
        groupId: TARGET_GROUP_ID,
        itemName: reportTitle,
        columnValues: {
          shift: formData.foreman,
          text: buildFullTextReport(),
          startDate: { date: formData.date },
        },
      });

      setSuccess('Daily Yard Report submitted successfully.');
      resetForm();
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not submit the report to Monday.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="wrap">
        <section className="hero">
          <h1>Daily Yard Report</h1>
        </section>

        <section className="card">
          <h2>Report Form</h2>

          {success ? <div className="notice success">{success}</div> : null}
          {error ? <div className="notice error show">{error}</div> : null}

          <form onSubmit={handleSubmit} className="form">
            <div className="grid">
              <Field label="Date *" error={validationErrors.date}>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                />
              </Field>

              <Field label="Location *" error={validationErrors.location}>
                <input
                  type="text"
                  placeholder="Apple St Yard"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                />
              </Field>

              <Field label="Job Number *" error={validationErrors.jobNumber}>
                <input
                  type="text"
                  placeholder="42-0101-00"
                  value={formData.jobNumber}
                  onChange={(e) => handleInputChange('jobNumber', e.target.value)}
                />
              </Field>

              <Field label="Cost Code *" error={validationErrors.costCode}>
                <input
                  type="text"
                  placeholder="3135"
                  value={formData.costCode}
                  onChange={(e) => handleInputChange('costCode', e.target.value)}
                />
              </Field>

              <Field label="Foreman *" error={validationErrors.foreman}>
                <input
                  type="text"
                  placeholder="First, Last Name"
                  value={formData.foreman}
                  onChange={(e) => handleInputChange('foreman', e.target.value)}
                />
              </Field>

              <Field label="Worker Count *" error={validationErrors.workerCount}>
                <input
                  type="number"
                  min="0"
                  placeholder="11"
                  value={formData.workerCount}
                  onChange={(e) => handleInputChange('workerCount', e.target.value)}
                />
              </Field>

              <Field label="Total Hours *" error={validationErrors.totalHours}>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="78"
                  value={formData.totalHours}
                  onChange={(e) => handleInputChange('totalHours', e.target.value)}
                />
              </Field>

              <Field label="Weather">
                <input
                  type="text"
                  placeholder="Clear, light wind"
                  value={formData.weather}
                  onChange={(e) => handleInputChange('weather', e.target.value)}
                />
              </Field>
            </div>

            <div className="section">
              <div className="section-header">
                <label>Daily Activities *</label>
                <button type="button" className="btn btn-secondary" onClick={addActivity}>
                  Add Activity
                </button>
              </div>

              {validationErrors.activities ? (
                <div className="error">{validationErrors.activities}</div>
              ) : null}

              <div className="activities">
                {activities.map((activity, index) => (
                  <div key={activity.id} className="activity-row">
                    <input
                      placeholder="6:00am"
                      value={activity.time}
                      onChange={(e) => updateActivity(activity.id, 'time', e.target.value)}
                    />
                    <textarea
                      rows="2"
                      placeholder={`Activity ${index + 1}`}
                      value={activity.description}
                      onChange={(e) => updateActivity(activity.id, 'description', e.target.value)}
                    />
                    {activities.length > 1 ? (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => removeActivity(activity.id)}
                      >
                        Remove
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid stack">
              <Field label="Delays / Issues" full>
                <textarea
                  rows="3"
                  placeholder="Any delays, missing materials, access issues, or blockers"
                  value={formData.delaysIssues}
                  onChange={(e) => handleInputChange('delaysIssues', e.target.value)}
                />
              </Field>

              <Field label="Safety Notes" full>
                <textarea
                  rows="3"
                  placeholder="Safety meeting notes, incidents, near misses, or observations"
                  value={formData.safetyNotes}
                  onChange={(e) => handleInputChange('safetyNotes', e.target.value)}
                />
              </Field>

              <Field label="Materials / Equipment" full>
                <textarea
                  rows="3"
                  placeholder="List materials moved, equipment used, or anything notable"
                  value={formData.materialsEquipment}
                  onChange={(e) => handleInputChange('materialsEquipment', e.target.value)}
                />
              </Field>
            </div>

            <div className="footer-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
