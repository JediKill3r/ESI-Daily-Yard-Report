import React, { useEffect, useState } from 'react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Textarea } from '@components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  Briefcase,
  Clock,
  CloudSun,
  FileText,
  MapPin,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';

const BOARD_ID = 18401951089;
const TARGET_GROUP_ID = 'new_group29179';

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
    if (!success) return undefined;
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
      const reportTitle = `Daily Yard Report - ${formData.location} - ${new Date(formData.date).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })}`;

      await submitToMonday({
        groupId: TARGET_GROUP_ID,
        itemName: reportTitle,
        columnValues: {
          shift: formData.foreman,
          text: buildSummary(),
          projectManagementNotes: [
            buildActivityLog(),
            '',
            buildDetailedNotes(),
            '',
            `Job Number: ${formData.jobNumber}`,
            `Cost Code: ${formData.costCode}`,
            `Worker Count: ${formData.workerCount}`,
            `Total Hours: ${formData.totalHours}`,
            `Weather: ${formData.weather || 'None'}`,
          ].join('\n'),
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
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        <Card className="border-border shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <FileText className="h-6 w-6" />
              Daily Yard Report
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {success ? (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              ) : null}

              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <section className="grid gap-4 md:grid-cols-2">
                <Field label="Date *" icon={<Clock className="h-4 w-4" />} error={validationErrors.date}>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                  />
                </Field>

                <Field label="Location *" icon={<MapPin className="h-4 w-4" />} error={validationErrors.location}>
                  <Input
                    placeholder="Apple St Yard"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                  />
                </Field>

                <Field label="Job Number *" icon={<Briefcase className="h-4 w-4" />} error={validationErrors.jobNumber}>
                  <Input
                    placeholder="42-0101-00"
                    value={formData.jobNumber}
                    onChange={(e) => handleInputChange('jobNumber', e.target.value)}
                  />
                </Field>

                <Field label="Cost Code *" error={validationErrors.costCode}>
                  <Input
                    placeholder="3135"
                    value={formData.costCode}
                    onChange={(e) => handleInputChange('costCode', e.target.value)}
                  />
                </Field>

                <Field label="Foreman *" icon={<Users className="h-4 w-4" />} error={validationErrors.foreman}>
                  <Input
                    placeholder="First, Last Name"
                    value={formData.foreman}
                    onChange={(e) => handleInputChange('foreman', e.target.value)}
                  />
                </Field>

                <Field label="Worker Count *" error={validationErrors.workerCount}>
                  <Input
                    type="number"
                    min="0"
                    placeholder="11"
                    value={formData.workerCount}
                    onChange={(e) => handleInputChange('workerCount', e.target.value)}
                  />
                </Field>

                <Field label="Total Hours *" error={validationErrors.totalHours}>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="78"
                    value={formData.totalHours}
                    onChange={(e) => handleInputChange('totalHours', e.target.value)}
                  />
                </Field>

                <Field label="Weather" icon={<CloudSun className="h-4 w-4" />}>
                  <Input
                    placeholder="Clear, light wind"
                    value={formData.weather}
                    onChange={(e) => handleInputChange('weather', e.target.value)}
                  />
                </Field>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Daily Activities *</Label>
                  <Button type="button" variant="outline" onClick={addActivity}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Activity
                  </Button>
                </div>

                {validationErrors.activities ? (
                  <p className="text-sm text-destructive">{validationErrors.activities}</p>
                ) : null}

                <div className="space-y-3">
                  {activities.map((activity, index) => (
                    <div key={activity.id} className="grid gap-2 md:grid-cols-[140px_1fr_auto]">
                      <Input
                        placeholder="6:00am"
                        value={activity.time}
                        onChange={(e) => updateActivity(activity.id, 'time', e.target.value)}
                      />
                      <Textarea
                        rows={2}
                        placeholder={`Activity ${index + 1}`}
                        value={activity.description}
                        onChange={(e) => updateActivity(activity.id, 'description', e.target.value)}
                      />
                      {activities.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeActivity(activity.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-4">
                <Field label="Delays / Issues" icon={<AlertTriangle className="h-4 w-4" />}>
                  <Textarea
                    rows={3}
                    placeholder="Any delays, missing materials, access issues, or blockers"
                    value={formData.delaysIssues}
                    onChange={(e) => handleInputChange('delaysIssues', e.target.value)}
                  />
                </Field>

                <Field label="Safety Notes">
                  <Textarea
                    rows={3}
                    placeholder="Safety meeting notes, incidents, near misses, or observations"
                    value={formData.safetyNotes}
                    onChange={(e) => handleInputChange('safetyNotes', e.target.value)}
                  />
                </Field>

                <Field label="Materials / Equipment">
                  <Textarea
                    rows={3}
                    placeholder="List materials moved, equipment used, or anything notable"
                    value={formData.materialsEquipment}
                    onChange={(e) => handleInputChange('materialsEquipment', e.target.value)}
                  />
                </Field>
              </section>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={submitting} className="min-w-40">
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, icon, error, children }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{label}</span>
      </Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
