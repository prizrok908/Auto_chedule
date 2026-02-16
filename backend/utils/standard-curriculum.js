/**
 * Стандартная учебная программа для школ Беларуси
 * Основана на типовом учебном плане
 */

const standardCurriculum = {
  // 1 класс
  1: [
    { name: 'Математика', hours_per_week: 4, needs_specialist: false },
    { name: 'Белорусский язык', hours_per_week: 5, needs_specialist: false },
    { name: 'Русский язык', hours_per_week: 5, needs_specialist: false },
    { name: 'Литературное чтение', hours_per_week: 4, needs_specialist: false },
    { name: 'Человек и мир', hours_per_week: 1, needs_specialist: false },
    { name: 'Физическая культура', hours_per_week: 2, needs_specialist: true },
    { name: 'Музыка', hours_per_week: 1, needs_specialist: true },
    { name: 'Изобразительное искусство', hours_per_week: 1, needs_specialist: true },
    { name: 'Трудовое обучение', hours_per_week: 1, needs_specialist: false }
  ],
  
  // 2-4 классы
  2: [
    { name: 'Математика', hours_per_week: 5, needs_specialist: false },
    { name: 'Белорусский язык', hours_per_week: 5, needs_specialist: false },
    { name: 'Русский язык', hours_per_week: 5, needs_specialist: false },
    { name: 'Литературное чтение', hours_per_week: 3, needs_specialist: false },
    { name: 'Иностранный язык', hours_per_week: 3, needs_specialist: true },
    { name: 'Человек и мир', hours_per_week: 2, needs_specialist: false },
    { name: 'Физическая культура', hours_per_week: 3, needs_specialist: true },
    { name: 'Музыка', hours_per_week: 1, needs_specialist: true },
    { name: 'Изобразительное искусство', hours_per_week: 1, needs_specialist: true },
    { name: 'Трудовое обучение', hours_per_week: 1, needs_specialist: false }
  ],
  
  3: [
    { name: 'Математика', hours_per_week: 5, needs_specialist: false },
    { name: 'Белорусский язык', hours_per_week: 5, needs_specialist: false },
    { name: 'Русский язык', hours_per_week: 5, needs_specialist: false },
    { name: 'Литературное чтение', hours_per_week: 3, needs_specialist: false },
    { name: 'Иностранный язык', hours_per_week: 3, needs_specialist: true },
    { name: 'Человек и мир', hours_per_week: 2, needs_specialist: false },
    { name: 'Физическая культура', hours_per_week: 3, needs_specialist: true },
    { name: 'Музыка', hours_per_week: 1, needs_specialist: true },
    { name: 'Изобразительное искусство', hours_per_week: 1, needs_specialist: true },
    { name: 'Трудовое обучение', hours_per_week: 1, needs_specialist: false }
  ],
  
  4: [
    { name: 'Математика', hours_per_week: 5, needs_specialist: false },
    { name: 'Белорусский язык', hours_per_week: 5, needs_specialist: false },
    { name: 'Русский язык', hours_per_week: 5, needs_specialist: false },
    { name: 'Литературное чтение', hours_per_week: 3, needs_specialist: false },
    { name: 'Иностранный язык', hours_per_week: 3, needs_specialist: true },
    { name: 'Человек и мир', hours_per_week: 2, needs_specialist: false },
    { name: 'Основы безопасности жизнедеятельности', hours_per_week: 1, needs_specialist: false },
    { name: 'Физическая культура', hours_per_week: 3, needs_specialist: true },
    { name: 'Музыка', hours_per_week: 1, needs_specialist: true },
    { name: 'Изобразительное искусство', hours_per_week: 1, needs_specialist: true },
    { name: 'Трудовое обучение', hours_per_week: 1, needs_specialist: false }
  ],
  
  // 5-9 классы
  5: [
    { name: 'Математика', hours_per_week: 5 },
    { name: 'Белорусский язык', hours_per_week: 3 },
    { name: 'Русский язык', hours_per_week: 3 },
    { name: 'Литература', hours_per_week: 2 },
    { name: 'Иностранный язык', hours_per_week: 3 },
    { name: 'Всемирная история', hours_per_week: 2 },
    { name: 'География', hours_per_week: 2 },
    { name: 'Биология', hours_per_week: 2 },
    { name: 'Информатика', hours_per_week: 1 },
    { name: 'Искусство', hours_per_week: 1 },
    { name: 'Трудовое обучение', hours_per_week: 2 },
    { name: 'Физическая культура', hours_per_week: 3 },
    { name: 'Основы безопасности жизнедеятельности', hours_per_week: 1 }
  ],
  
  6: [
    { name: 'Математика', hours_per_week: 5 },
    { name: 'Белорусский язык', hours_per_week: 3 },
    { name: 'Русский язык', hours_per_week: 3 },
    { name: 'Литература', hours_per_week: 2 },
    { name: 'Иностранный язык', hours_per_week: 3 },
    { name: 'Всемирная история', hours_per_week: 2 },
    { name: 'История Беларуси', hours_per_week: 1 },
    { name: 'География', hours_per_week: 2 },
    { name: 'Биология', hours_per_week: 2 },
    { name: 'Информатика', hours_per_week: 1 },
    { name: 'Искусство', hours_per_week: 1 },
    { name: 'Трудовое обучение', hours_per_week: 2 },
    { name: 'Физическая культура', hours_per_week: 3 },
    { name: 'Основы безопасности жизнедеятельности', hours_per_week: 1 }
  ],
  
  7: [
    { name: 'Математика', hours_per_week: 5 },
    { name: 'Белорусский язык', hours_per_week: 2 },
    { name: 'Русский язык', hours_per_week: 2 },
    { name: 'Литература', hours_per_week: 2 },
    { name: 'Иностранный язык', hours_per_week: 3 },
    { name: 'Всемирная история', hours_per_week: 2 },
    { name: 'История Беларуси', hours_per_week: 2 },
    { name: 'География', hours_per_week: 2 },
    { name: 'Биология', hours_per_week: 2 },
    { name: 'Физика', hours_per_week: 2 },
    { name: 'Информатика', hours_per_week: 1 },
    { name: 'Искусство', hours_per_week: 1 },
    { name: 'Трудовое обучение', hours_per_week: 2 },
    { name: 'Физическая культура', hours_per_week: 3 },
    { name: 'Основы безопасности жизнедеятельности', hours_per_week: 1 }
  ],
  
  8: [
    { name: 'Математика', hours_per_week: 5 },
    { name: 'Белорусский язык', hours_per_week: 2 },
    { name: 'Русский язык', hours_per_week: 2 },
    { name: 'Литература', hours_per_week: 2 },
    { name: 'Иностранный язык', hours_per_week: 3 },
    { name: 'Всемирная история', hours_per_week: 2 },
    { name: 'История Беларуси', hours_per_week: 2 },
    { name: 'Обществоведение', hours_per_week: 1 },
    { name: 'География', hours_per_week: 2 },
    { name: 'Биология', hours_per_week: 2 },
    { name: 'Физика', hours_per_week: 2 },
    { name: 'Химия', hours_per_week: 2 },
    { name: 'Информатика', hours_per_week: 1 },
    { name: 'Искусство', hours_per_week: 1 },
    { name: 'Черчение', hours_per_week: 1 },
    { name: 'Трудовое обучение', hours_per_week: 1 },
    { name: 'Физическая культура', hours_per_week: 3 },
    { name: 'Основы безопасности жизнедеятельности', hours_per_week: 1 }
  ],
  
  9: [
    { name: 'Математика', hours_per_week: 5 },
    { name: 'Белорусский язык', hours_per_week: 2 },
    { name: 'Русский язык', hours_per_week: 2 },
    { name: 'Литература', hours_per_week: 2 },
    { name: 'Иностранный язык', hours_per_week: 3 },
    { name: 'Всемирная история', hours_per_week: 2 },
    { name: 'История Беларуси', hours_per_week: 2 },
    { name: 'Обществоведение', hours_per_week: 1 },
    { name: 'География', hours_per_week: 2 },
    { name: 'Биология', hours_per_week: 2 },
    { name: 'Физика', hours_per_week: 3 },
    { name: 'Химия', hours_per_week: 2 },
    { name: 'Информатика', hours_per_week: 1 },
    { name: 'Черчение', hours_per_week: 1 },
    { name: 'Трудовое обучение', hours_per_week: 1 },
    { name: 'Физическая культура', hours_per_week: 3 },
    { name: 'Основы безопасности жизнедеятельности', hours_per_week: 1 }
  ],
  
  // 10-11 классы
  10: [
    { name: 'Математика', hours_per_week: 5 },
    { name: 'Белорусский язык', hours_per_week: 2 },
    { name: 'Русский язык', hours_per_week: 2 },
    { name: 'Литература', hours_per_week: 3 },
    { name: 'Иностранный язык', hours_per_week: 3 },
    { name: 'Всемирная история', hours_per_week: 2 },
    { name: 'История Беларуси', hours_per_week: 2 },
    { name: 'Обществоведение', hours_per_week: 2 },
    { name: 'География', hours_per_week: 1 },
    { name: 'Биология', hours_per_week: 2 },
    { name: 'Физика', hours_per_week: 3 },
    { name: 'Химия', hours_per_week: 2 },
    { name: 'Информатика', hours_per_week: 1 },
    { name: 'Астрономия', hours_per_week: 1 },
    { name: 'Трудовое обучение', hours_per_week: 2 },
    { name: 'Физическая культура', hours_per_week: 3 },
    { name: 'Основы безопасности жизнедеятельности', hours_per_week: 1 }
  ],
  
  11: [
    { name: 'Математика', hours_per_week: 5 },
    { name: 'Белорусский язык', hours_per_week: 2 },
    { name: 'Русский язык', hours_per_week: 2 },
    { name: 'Литература', hours_per_week: 3 },
    { name: 'Иностранный язык', hours_per_week: 3 },
    { name: 'Всемирная история', hours_per_week: 2 },
    { name: 'История Беларуси', hours_per_week: 2 },
    { name: 'Обществоведение', hours_per_week: 2 },
    { name: 'География', hours_per_week: 1 },
    { name: 'Биология', hours_per_week: 2 },
    { name: 'Физика', hours_per_week: 3 },
    { name: 'Химия', hours_per_week: 2 },
    { name: 'Информатика', hours_per_week: 1 },
    { name: 'Трудовое обучение', hours_per_week: 2 },
    { name: 'Физическая культура', hours_per_week: 3 },
    { name: 'Основы безопасности жизнедеятельности', hours_per_week: 1 }
  ]
};

/**
 * Получить стандартную программу для класса
 */
function getStandardCurriculum(classNumber) {
  return standardCurriculum[classNumber] || [];
}

module.exports = {
  standardCurriculum,
  getStandardCurriculum
};
