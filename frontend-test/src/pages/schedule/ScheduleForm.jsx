import { Link } from 'react-router-dom'
import { DOSAGE_UNIT_OPTIONS, MAX_TIMES_PER_DAY, TIMING_OPTIONS } from './constants'
import ScheduleTabs from './ScheduleTabs'

function ScheduleForm({
  title,
  description,
  submitLabel,
  form,
  timeSlots,
  calculatedWindow,
  message,
  loading,
  onFormChange,
  onTimeSlotChange,
  onSubmit,
}) {
  return (
    <div className="schedule-page">
      <section className="schedule-hero">
        <div>
          <p className="schedule-eyebrow">Medication planner</p>
          <h1>{title}</h1>
          <p className="schedule-subtitle">{description}</p>
        </div>
        <div className="schedule-status-card">
          <span className="schedule-status-label">Quick links</span>
          <strong>
            <Link className="schedule-inline-link" to="/schedule-test">
              My schedules
            </Link>
          </strong>
          <strong>
            <Link className="schedule-inline-link" to="/schedule-test/new">
              Create new
            </Link>
          </strong>
        </div>
      </section>

      <ScheduleTabs />

      {message && <div className="schedule-banner">{message}</div>}

      <section className="schedule-card schedule-card-wide">
        <div className="schedule-card-header">
          <h2>Schedule details</h2>
          <p>Enter only user-facing values. Internal ids and frequency fields stay hidden.</p>
        </div>

        <div className="schedule-form-grid">
          <label className="schedule-col-span-2">
            Medicine name
            <input
              name="customMedicineName"
              value={form.customMedicineName}
              onChange={onFormChange}
              placeholder="Tylenol, digestive aid, vitamin C..."
            />
          </label>

          <label>
            Prescribing hospital
            <input
              name="hospitalName"
              value={form.hospitalName}
              onChange={onFormChange}
              placeholder="Seoul Internal Medicine"
            />
          </label>

          <label>
            Dispensing pharmacy
            <input
              name="pharmacyName"
              value={form.pharmacyName}
              onChange={onFormChange}
              placeholder="Green Pharmacy"
            />
          </label>

          <label>
            Dosage amount
            <input
              name="dosageAmount"
              type="number"
              min="0"
              step="0.5"
              value={form.dosageAmount}
              onChange={onFormChange}
            />
          </label>

          <label>
            Unit
            <select name="dosageUnit" value={form.dosageUnit} onChange={onFormChange}>
              {DOSAGE_UNIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Times per day
            <input
              name="timesPerDay"
              type="number"
              min="1"
              max={MAX_TIMES_PER_DAY}
              value={form.timesPerDay}
              onChange={onFormChange}
            />
          </label>

          <label>
            Total days
            <input
              name="durationDays"
              type="number"
              min="1"
              value={form.durationDays}
              onChange={onFormChange}
            />
          </label>

          <label>
            Prescribed date
            <input type="date" name="prescribedDate" value={form.prescribedDate} onChange={onFormChange} />
          </label>

          <label>
            Dispensed date
            <input type="date" name="dispensedDate" value={form.dispensedDate} onChange={onFormChange} />
          </label>
        </div>

        <div className="schedule-meta-strip">
          <div>
            <span className="schedule-status-label">Calculated start</span>
            <strong>{calculatedWindow?.startDate || 'Will be calculated after save'}</strong>
          </div>
          <div>
            <span className="schedule-status-label">Calculated end</span>
            <strong>{calculatedWindow?.endDate || 'Will be calculated after save'}</strong>
          </div>
        </div>

        <div className="schedule-time-block">
          <div className="schedule-card-header">
            <h2>Dose times</h2>
            <p>The server uses the current registration time and the slots below to decide the first active dose.</p>
          </div>

          <div className="schedule-slot-list">
            {timeSlots.map((slot, index) => (
              <div className="schedule-slot-card" key={`slot-${index + 1}`}>
                <div className="schedule-slot-title">Dose {index + 1}</div>
                <label>
                  Time
                  <input
                    type="time"
                    value={slot.takeTime}
                    onChange={(event) => onTimeSlotChange(index, 'takeTime', event.target.value)}
                  />
                </label>
                <label>
                  Timing
                  <select
                    value={slot.timing}
                    onChange={(event) => onTimeSlotChange(index, 'timing', event.target.value)}
                  >
                    {TIMING_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="schedule-actions">
          <button type="button" onClick={onSubmit} disabled={loading}>
            {loading ? 'Saving...' : submitLabel}
          </button>
          <Link className="schedule-secondary-link" to="/schedule-test">
            Back to list
          </Link>
        </div>
      </section>
    </div>
  )
}

export default ScheduleForm
