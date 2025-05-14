"use client"
import { Calendar, Heart, Clock } from "lucide-react"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function TimelinePage() {
  // Datos de ejemplo - reemplazar con tus propios recuerdos
  const memories = [
    {
      id: 1,
      date: "10 de Julio, 2022",
      title: "Nuestro Primer Encuentro",
      description: "El día que nos conocimos por primera vez.",
      image: "/placeholder.svg?height=300&width=500",
    },
    {
      id: 2,
      date: "15 de Agosto, 2022",
      title: "Primera Cita Oficial",
      description: "Nuestra primera cita en aquel restaurante italiano.",
      image: "/placeholder.svg?height=300&width=500",
    },
    {
      id: 3,
      date: "24 de Diciembre, 2022",
      title: "Primera Navidad Juntos",
      description: "Celebramos nuestra primera Navidad como pareja.",
      image: "/placeholder.svg?height=300&width=500",
    },
    {
      id: 4,
      date: "14 de Febrero, 2023",
      title: "San Valentín",
      description: "Nuestro primer San Valentín juntos.",
      image: "/placeholder.svg?height=300&width=500",
    },
    {
      id: 5,
      date: "10 de Julio, 2023",
      title: "Primer Aniversario",
      description: "Celebramos nuestro primer año juntos.",
      image: "/placeholder.svg?height=300&width=500",
    },
    {
      id: 6,
      date: "10 de Julio, 2024",
      title: "Segundo Aniversario",
      description: "¡Dos años maravillosos juntos!",
      image: "/placeholder.svg?height=300&width=500",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-2 bg-rose-100 dark:bg-rose-900/30 rounded-full mb-4">
          <Clock className="h-6 w-6 text-rose-500 dark:text-rose-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nuestra Historia</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Un viaje por nuestros momentos especiales</p>
      </header>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="relative pl-8 pb-8">
          {/* Línea vertical */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-rose-300 to-indigo-300 dark:from-rose-700 dark:to-indigo-700" />

          {memories.map((memory, index) => (
            <div key={memory.id} className="mb-8 relative">
              {/* Punto en la línea */}
              <div className="absolute -left-4 w-8 h-8 rounded-full bg-white dark:bg-gray-900 border-2 border-rose-400 dark:border-rose-600 flex items-center justify-center">
                <Heart className="h-4 w-4 text-rose-500 dark:text-rose-400" />
              </div>

              {/* Tarjeta de memoria */}
              <Card className="ml-6 overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={memory.image || "/placeholder.svg"}
                    alt={memory.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-white/90 dark:bg-gray-900/90 px-3 py-1 rounded-full flex items-center">
                    <Calendar className="h-3 w-3 mr-1 text-rose-500 dark:text-rose-400" />
                    <span className="text-xs font-medium">{memory.date}</span>
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle>{memory.title}</CardTitle>
                  <CardDescription>{memory.description}</CardDescription>
                </CardHeader>
              </Card>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
