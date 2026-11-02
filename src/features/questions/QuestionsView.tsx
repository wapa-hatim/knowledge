import { useState } from 'react'
import { ArrowLeft, ArrowUp, Check, MessageSquareText, Plus, Send, Sparkles } from 'lucide-react'
import type { KnowledgeQuestion, Role } from '../../types'
import { Button } from '../../components/ui/Button'
import '../spaces/workspace-pages.css'

const createQuestionId = () => `Q-${Date.now().toString().slice(-3)}`
const createAnswerId = () => `A-${Date.now()}`

interface QuestionsViewProps { questions: KnowledgeQuestion[]; role: Role; onQuestionsChange: (questions: KnowledgeQuestion[]) => void }

export function QuestionsView({ questions, role, onQuestionsChange }: QuestionsViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [answer, setAnswer] = useState('')
  const [space, setSpace] = useState('Engineering')
  const selectedQuestion = questions.find((question) => question.id === selectedId)
  const canVerify = role === 'Super Admin' || role === 'Space Admin' || role === 'Reviewer'

  const updateQuestion = (id: string, update: (question: KnowledgeQuestion) => KnowledgeQuestion) => onQuestionsChange(questions.map((question) => question.id === id ? update(question) : question))
  const submitQuestion = () => {
    if (!title.trim() || !body.trim()) return
    const newQuestion: KnowledgeQuestion = { id: createQuestionId(), title: title.trim(), body: body.trim(), space, tags: [], author: 'Amina Yusuf', createdAt: 'Just now', votes: 0, answers: [] }
    onQuestionsChange([newQuestion, ...questions])
    setSelectedId(newQuestion.id)
    setAsking(false)
    setTitle('')
    setBody('')
  }
  const submitAnswer = () => {
    if (!selectedQuestion || !answer.trim()) return
    updateQuestion(selectedQuestion.id, (question) => ({ ...question, answers: [...question.answers, { id: createAnswerId(), author: 'Amina Yusuf', body: answer.trim(), votes: 0, verified: false }] }))
    setAnswer('')
  }

  if (selectedQuestion) return <section className="page-section questions-page"><button className="back-action" type="button" onClick={() => setSelectedId(null)}><ArrowLeft size={15} />All questions</button><article className="question-detail"><div className="question-detail-heading"><div><div className="eyebrow">{selectedQuestion.space.toUpperCase()} / KNOWLEDGE EXCHANGE</div><h1>{selectedQuestion.title}</h1><p>{selectedQuestion.body}</p><div className="question-tags">{selectedQuestion.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div><small>Asked by {selectedQuestion.author} · {selectedQuestion.createdAt}</small></div><button className="question-vote-button" type="button" onClick={() => updateQuestion(selectedQuestion.id, (question) => ({ ...question, votes: question.votes + 1 }))}><ArrowUp size={18} /><strong>{selectedQuestion.votes}</strong><span>Vote</span></button></div><div className="answers-heading"><h2>{selectedQuestion.answers.length} answers</h2><span>Verified answers appear first</span></div>{selectedQuestion.answers.map((item) => <article className={`answer-card${item.verified || selectedQuestion.acceptedAnswerId === item.id ? ' accepted' : ''}`} key={item.id}><div className="answer-author"><span className="activity-person person-mint">{item.author.split(' ').map((part) => part[0]).join('')}</span><strong>{item.author}</strong>{(item.verified || selectedQuestion.acceptedAnswerId === item.id) && <span className="verified-answer"><Check size={12} />Verified answer</span>}</div><p>{item.body}</p><div className="answer-actions"><button type="button" onClick={() => updateQuestion(selectedQuestion.id, (question) => ({ ...question, answers: question.answers.map((answerItem) => answerItem.id === item.id ? { ...answerItem, votes: answerItem.votes + 1 } : answerItem) }))}><ArrowUp size={14} />Helpful · {item.votes}</button>{canVerify && selectedQuestion.acceptedAnswerId !== item.id && <button type="button" onClick={() => updateQuestion(selectedQuestion.id, (question) => ({ ...question, acceptedAnswerId: item.id }))}><Check size={14} />Accept solution</button>}</div></article>)}<div className="answer-compose"><label htmlFor="answer-body">Share what you know</label><textarea id="answer-body" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Write a clear, useful answer…" /><Button onClick={submitAnswer}><Send size={14} />Post answer</Button></div></article></section>

  return <section className="page-section questions-page"><div className="page-heading"><div><div className="eyebrow">KNOWLEDGE EXCHANGE</div><h1>Questions & answers</h1><p>Find a verified answer or help someone else move forward.</p></div><Button onClick={() => setAsking(true)}><Plus size={15} />Ask a question</Button></div><div className="question-list">{questions.map((question) => <button className="question-row question-list-button" type="button" key={question.id} onClick={() => { setSelectedId(question.id); setAsking(false) }}><span className="question-votes"><strong>{question.votes}</strong><span>votes</span></span><span className="question-copy"><strong>{question.title}</strong><small>{question.space} <i /> {question.answers.length} answers <i /> asked {question.createdAt.toLowerCase()}</small></span><span className={`status-pill${question.acceptedAnswerId ? ' status-published' : question.answers.length ? ' status-under-review' : ' status-open'}`}>{question.acceptedAnswerId ? 'Solved' : question.answers.length ? 'Answered' : 'Open'}</span><MessageSquareText size={16} /></button>)}</div>{questions.length === 0 && <div className="search-empty"><Sparkles size={20} /><h2>No questions yet</h2><p>Start the conversation and share what your team needs to know.</p></div>}{asking && <div className="question-form panel"><div className="panel-heading"><div><h2>Ask your team</h2><p>Add enough context to get a useful answer.</p></div><button type="button" onClick={() => setAsking(false)} aria-label="Close question form">×</button></div><label>Question title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What do you need help with?" /></label><label>Details<textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Share what you have tried and any helpful context." /></label><label>Space<select value={space} onChange={(event) => setSpace(event.target.value)}><option>Engineering</option><option>Product & Design</option><option>People & Finance</option><option>Customer Success</option><option>Security</option></select></label><div className="question-form-actions"><Button variant="ghost" onClick={() => setAsking(false)}>Cancel</Button><Button onClick={submitQuestion}><Plus size={14} />Post question</Button></div></div>}</section>
}