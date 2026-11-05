import { useState } from 'react'

// A preview of the briefing agent, and the questions Mike is asking builders about it
const TOOLS = [
  ['find_block', 'turns an address into a city block'],
  ['get_series', 'gets the block’s rent history by year'],
  ['compare_blocks', 'compares it with Sea Point as a whole'],
  ['set_view', 'moves the camera and the year'],
  ['write_brief', 'writes a short brief, every number labelled'],
]

const QUESTIONS = [
  'The Agent SDK runs the Claude Code engine, which may not fit a standard serverless function. Where would you host it?',
  'Should the agent drive the map itself, or only return data and let the page animate it?',
  'How do I stop it inventing numbers? Is “cite only what the tools return” enough?',
  'Do you know a source of real rent or short-term rental data for Cape Town, or for your city?',
]

export default function AgentQuestions({ steps, running, onRun }) {
  const [open, setOpen] = useState(false)
  const finished = !running && steps.length > 0

  return (
    <>
      <button className="agent-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Close' : 'Help me build the agent'}
        {!open && <span className="marker marker--next" aria-hidden="true" />}
      </button>

      {open && (
        <aside className="agent-panel" aria-label="The agent, and questions for you">
          <p className="agent-panel__eyebrow">Next: the briefing agent · preview</p>
          <p className="agent-panel__ask">
            <span className="marker marker--start" aria-hidden="true" />
            “What’s happened to my block since 2010?”
          </p>
          <p className="agent-panel__lead">
            A Claude Agent SDK agent answers by choosing which tools to call, picking the years that matter and
            moving the map to show them.
          </p>

          <button className="agent-run" onClick={onRun} disabled={running}>
            {running ? 'Running…' : finished ? 'Play again' : 'Play the preview'}
            <span className="marker marker--next" aria-hidden="true" />
          </button>

          {steps.length > 0 ? (
            <ol className="agent-panel__steps" aria-live="polite">
              {steps.map((step, i) => (
                <li key={i} className={running && i === steps.length - 1 ? 'is-current' : ''}>
                  <code>{step.tool}</code> {step.result}
                </li>
              ))}
              {finished && (
                <li className="agent-panel__done">
                  Scripted preview, synthetic data
                  <span className="marker marker--end" aria-hidden="true" />
                </li>
              )}
            </ol>
          ) : (
            <ul className="agent-panel__tools">
              {TOOLS.map(([name, does]) => (
                <li key={name}>
                  <code>{name}</code> {does}
                </li>
              ))}
            </ul>
          )}

          <p className="agent-panel__eyebrow agent-panel__eyebrow--questions">Questions for you</p>
          <ol className="agent-panel__questions">
            {QUESTIONS.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
          <p className="agent-panel__close">
            Find Mike after the talk
            <span className="marker marker--end" aria-hidden="true" />
          </p>
        </aside>
      )}
    </>
  )
}
