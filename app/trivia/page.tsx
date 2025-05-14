"use client"

import { useState } from "react"
import { Check, GamepadIcon, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export default function TriviaPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

  // Preguntas de ejemplo - reemplazar con preguntas personalizadas sobre su relación
  const questions = [
    {
      question: "¿Dónde fue nuestra primera cita?",
      options: ["En la plaza", "En el cine", "En Starbucks", "En la playa"],
      correctAnswer: 2,
    },
    {
      question: "¿En dónde se suponía que iba a ser nuestra primera cita?",
      options: ["En la plaza", "En Havanna", "En Starbucks", "En el cine"],
      correctAnswer: 1,
    },
    {
      question: "¿Qué película vimos en nuestra primera cita?",
      options: ["Una comedia romántica", "Una película de acción", "Una película de terror", "Un documental"],
      correctAnswer: 1,
    },
    {
      question: "¿Cuál es nuestro color?",
      options: ["Naranja", "Azul", "Verde", "Amarillo"],
      correctAnswer: 0,
    },
    {
      question: "¿Qué canción consideramos 'nuestra canción'?",
      options: [
        "Perfect - Ed Sheeran",
        "All of Me - John Legend",
        "Can't Help Falling in Love - Elvis Presley",
        "Beautiful Things - Benson Boone",
      ],
      correctAnswer: 3,
    },
    {
      question: "¿Qué película vimos en lo de Emi?",
      options: ["The Dark Knight", "Bullet Train", "Harry Potter", "Wicked"],
      correctAnswer: 0,
    },
    {
      question: "¿Cuál de estas series no vimos juntos?",
      options: ["Friends", "The Office", "Breaking Bad", "The Big Bang Theory"],
      correctAnswer: 2,
    },
    {
      question: "¿Cuál es nuestra comida predilecta?",
      options: ["Pizza", "Hamburguesa", "Fideos con salsa", "Tacos"],
      correctAnswer: 2,
    },
    {
      question: "¿En qué fecha nos conocimos por Tinder?",
      options: ["9 de junio de 2023", "9 de abril de 2023", "9 de mayo de 2023", "9 de julio de 2023"],
      correctAnswer: 3,
    },
    {
      question: "¿Cuál de estos regalos NO te di en tus 30 años?",
      options: ["Posavasos de Veep", "Bufanda de Harry Potter", "Álbum de fotos", "Cupones"],
      correctAnswer: 1,
    },
  ]

  const handleAnswerClick = (answerIndex: number) => {
    setSelectedAnswer(answerIndex)
    const correct = answerIndex === questions[currentQuestion].correctAnswer
    setIsCorrect(correct)

    if (correct) {
      setScore(score + 1)
    }

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1)
        setSelectedAnswer(null)
        setIsCorrect(null)
      } else {
        setShowResult(true)
      }
    }, 1000)
  }

  const restartQuiz = () => {
    setCurrentQuestion(0)
    setScore(0)
    setShowResult(false)
    setSelectedAnswer(null)
    setIsCorrect(null)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4">
          <GamepadIcon className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trivia de Nuestra Relación</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">¿Cuánto nos conocemos?</p>
      </header>

      {!showResult ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Pregunta {currentQuestion + 1} de {questions.length}
              </span>
              <span className="text-sm font-medium text-indigo-500 dark:text-indigo-400">Puntuación: {score}</span>
            </div>
            <Progress value={((currentQuestion + 1) / questions.length) * 100} className="h-1" />
            <CardTitle className="mt-4">{questions[currentQuestion].question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions[currentQuestion].options.map((option, index) => (
              <Button
                key={index}
                variant={selectedAnswer === index ? (isCorrect ? "outline" : "outline") : "outline"}
                className={`w-full justify-start text-left ${
                  selectedAnswer === index
                    ? isCorrect
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-red-500 bg-red-50 dark:bg-red-900/20"
                    : ""
                }`}
                onClick={() => handleAnswerClick(index)}
                disabled={selectedAnswer !== null}
              >
                <div className="flex items-center w-full">
                  <span>{option}</span>
                  {selectedAnswer === index && (
                    <span className="ml-auto">
                      {isCorrect ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </span>
                  )}
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <CardTitle>¡Juego terminado!</CardTitle>
            <CardDescription>Tu puntuación final</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-indigo-500 dark:text-indigo-400 mb-4">
              {score} / {questions.length}
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              {score === questions.length
                ? "¡Perfecto! Me conoces muy bien ❤️"
                : score >= questions.length / 2
                  ? "¡Buen trabajo! Nos conocemos bastante bien."
                  : "Aún tenemos mucho por descubrir el uno del otro."}
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={restartQuiz} className="w-full">
              Jugar de nuevo
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
