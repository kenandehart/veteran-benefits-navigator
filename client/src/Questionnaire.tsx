import { useState } from 'react';
import './App.css';

function Questionnaire() {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({
        serviceStartDate: '',
        serviceEndDate: '',
        dischargeStatus: '',
        disabilityRating: '',
    });
    const questions = [
        { field: 'serviceStartDate', label: 'When did you begin your service?', type: 'date' },
        { field: 'serviceEndDate', label: 'When did your service end?', type: 'date' },
        { field: 'dischargeStatus', label: 'What was your characterization of discharge?', type: 'select' },
        { field: 'disabilityRating', label: 'What is your current VA disability rating?', type: 'number' },
    ];
    const question = questions[currentQuestion];
    const handleNext = () => {
        setCurrentQuestion(currentQuestion + 1);
    }

    return (
        <div className="page">
            <header className="header">
                <span className="wordmark">Benefits Navigator</span>
            </header>

            <main className="q-main">
                <div className="q-card">
                    <div className="q-progress-text">
                        Step {currentQuestion + 1} of 4
                    </div>

                    <label className="q-label" htmlFor="q-input">
                        {question.label}
                    </label>

                    {question.type === 'date' && (
                        <input
                            id="q-input"
                            type="date"
                            className="q-input"
                            value={answers[question.field as keyof typeof answers]}
                            onChange={(e) => setAnswers({ ...answers, [question.field]: e.target.value })}
                        />
                    )}

                    {question.type === 'select' && (
                        <select
                            id="q-input"
                            className="q-input q-select"
                            value={answers[question.field as keyof typeof answers]}
                            onChange={(e) => setAnswers({ ...answers, [question.field]: e.target.value })}
                        >
                            <option value="">Select one…</option>
                            <option value="Honorable">Honorable</option>
                            <option value="General">General</option>
                            <option value="Other Than Honorable">Other Than Honorable</option>
                            <option value="Uncharacterized">Uncharacterized</option>
                        </select>
                    )}

                    {question.type === 'number' && (
                        <input
                            id="q-input"
                            type="number"
                            min="0"
                            max="100"
                            className="q-input"
                            value={answers[question.field as keyof typeof answers]}
                            onChange={(e) => setAnswers({ ...answers, [question.field]: e.target.value })}
                        />
                    )}

                    <button className="cta-button q-next-btn" onClick={handleNext}>
                        {currentQuestion === 3 ? 'Submit' : 'Next'}
                    </button>

                    <div className="q-dots" aria-hidden="true">
                        {[0, 1, 2, 3].map((i) => (
                            <span
                                key={i}
                                className={`q-dot${i === currentQuestion ? ' q-dot--active' : ''}`}
                            />
                        ))}
                    </div>
                </div>
            </main>

            <footer className="footer">
                <p>Built for veterans, by veterans.</p>
            </footer>
        </div>
    );
}

export default Questionnaire;