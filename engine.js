const crypto = require('crypto')

const DICES_AMOUNT = 5
const DICE_FACES_AMOUNT = 6

const ITEM_NAMES = [
  {
    group: 'school',
    name: 'school_1',
    writable: true,
    ru: '1'
  },
  {
    group: 'school',
    name: 'school_2',
    writable: true,
    ru: '2'
  },
  {
    group: 'school',
    name: 'school_3',
    writable: true,
    ru: '3'
  },
  {
    group: 'school',
    name: 'school_4',
    writable: true,
    ru: '4'
  },
  {
    group: 'school',
    name: 'school_5',
    writable: true,
    ru: '5'
  },
  {
    group: 'school',
    name: 'school_6',
    writable: true,
    ru: '6'
  },
  {
    name: 'school_sum',
    writable: false,
    ru: '∑'
  },
  {
    group: 'combo',
    name: 'one_pair',
    writable: true,
    ru: '2'
  },
  {
    group: 'combo',
    name: 'set',
    writable: true,
    ru: '3'
  },
  {
    group: 'combo',
    name: 'two_pairs',
    writable: true,
    ru: '2+2'
  },
  {
    group: 'combo',
    name: 'full_house',
    writable: true,
    ru: '3+2'
  },
  {
    group: 'combo',
    name: 'small_straight',
    writable: true,
    ru: 'М.С.'
  },
  {
    group: 'combo',
    name: 'big_straight',
    writable: true,
    ru: 'Б.С.'
  },
  {
    group: 'combo',
    name: 'quads',
    writable: true,
    ru: 'Каре'
  },
  {
    group: 'combo',
    name: 'poker',
    writable: true,
    ru: 'Покер'
  },
  {
    group: 'combo',
    name: 'sum',
    writable: true,
    ru: '∑ общ'
  },
  {
    name: 'total',
    writable: false,
    ru: 'Итог'
  }
]

const SCHOOL_NAMES = {
  1: 'school_1',
  2: 'school_2',
  3: 'school_3',
  4: 'school_4',
  5: 'school_5',
  6: 'school_6'
}

const COMBO_NAMES = {
  ONE_PAIR: 'one_pair',
  SET: 'set',
  TWO_PAIR: 'two_pairs',
  FULL_HOUSE: 'full_house',
  SMALL_STRAIGHT: 'small_straight',
  BIG_STRAIGHT: 'big_straight',
  QUAD: 'quads',
  POKER: 'poker',
  SUM: 'sum'
}

function initTable () {
  let obj = {}
  ITEM_NAMES.forEach(v => {
    obj[v.name] = {
      points: null,
      writable: v.name !== 'school_sum' && v.name !== 'total'
    }
  })
  return obj
}

function rand () {
  let buf = crypto.randomBytes(4)
  let read = buf.readUInt32BE(0)
  let val = read / 0x100000000 // 2^32
  console.log('rand > buf:', buf);
  console.log('rand > read:', read);
  console.log('rand > val:', val);
  return val
}

function getRandomDiceFace () {
  let val = Math.floor(rand() * DICE_FACES_AMOUNT) + 1
  console.log('getRandomDiceFace:', val);
  return val
}

function makeShot () {
  let arr = []
  while (arr.length < DICES_AMOUNT) {
    arr.push(getRandomDiceFace())
  }
  return arr // arr.sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
}

function getCombos (values, serial) {
  let transformMatrix = []
  for (let i = 0; i < values.length; i++) {
    let value = values[i]
    transformMatrix[i] = []
    for (let j = 0; j < values.length; j++) {
      if (i == j) transformMatrix[i][j] = 1
      else if (values[j] == value) transformMatrix[i][j] = 1
      else transformMatrix[i][j] = 0
    }
  }

  // console.log('transformMatrix:', transformMatrix)

  let weights = []
  transformMatrix.forEach(v => {
    weights.push(v.reduce((acc, cur) => acc + cur))
  })

  // console.log('weights:', weights)

  let results = {
    shot: values,
    faces: [],
    combos: [],
    school: null
  }

  let faces = []
  let matchDictionary = {}

  for (let i = 0; i < weights.length; i++) {
    let value = values[i]
    let count = weights[i]

    let face = faces.find(v => v.value == value)
    if (face) face.count = count
    else faces.push({ value, count })

    if (!matchDictionary[count]) matchDictionary[count] = []
    if (!matchDictionary[count].includes(value)) matchDictionary[count].push(value)
  }

  // console.log('faces:', faces)
  // console.log('matchDictionary:', matchDictionary)

  results.faces = faces

  // анализировать совпадения
  if (weights.some(v => v > 1)) {
    let m = matchDictionary

    if (m['2']) {
      let value1 = m['2'][0]

      results.combos.push({
        name: COMBO_NAMES.ONE_PAIR,
        points: value1 * 2
      })

      if (m['2'][1]) {
        let value2 = m['2'][1]

        results.combos.push({
          name: COMBO_NAMES.TWO_PAIR,
          points: (value1 + value2) * 2
        })

        results.combos.push({
          name: COMBO_NAMES.ONE_PAIR,
          points: value2 * 2
        })
      }
    }

    if (m['3']) {
      let value1 = m['3'][0]

      results.combos.push({
        name: COMBO_NAMES.SET,
        points: value1 * 3
      })

      results.combos.push({
        name: COMBO_NAMES.ONE_PAIR,
        points: value1 * 2
      })

      results.school = { face: value1, points: 0 }

      if (m['2']) {
        let value2 = m['2'][0]

        results.combos.push({
          name: COMBO_NAMES.FULL_HOUSE,
          points: value1 * 3 + value2 * 2
        })

        results.combos.push({
          name: COMBO_NAMES.ONE_PAIR,
          points: value2 * 2
        })
      }
    }

    if (m['4']) {
      let value = m['4'][0]

      results.combos.push({
        name: COMBO_NAMES.ONE_PAIR,
        points: value * 2
      })

      results.combos.push({
        name: COMBO_NAMES.SET,
        points: value * 3
      })

      results.combos.push({
        name: COMBO_NAMES.TWO_PAIR,
        points: value * 4
      })

      results.combos.push({
        name: COMBO_NAMES.QUAD,
        points: value * 4
      })

      results.school = { face: value, points: value }
    }

    if (m['5']) {
      let value = m['5'][0]

      results.combos.push({
        name: COMBO_NAMES.ONE_PAIR,
        points: value * 2
      })

      results.combos.push({
        name: COMBO_NAMES.SET,
        points: value * 3
      })

      results.combos.push({
        name: COMBO_NAMES.TWO_PAIR,
        points: value * 4
      })

      results.combos.push({
        name: COMBO_NAMES.QUAD,
        points: value * 4
      })

      results.combos.push({
        name: COMBO_NAMES.FULL_HOUSE,
        points: value * 5
      })

      results.combos.push({
        name: COMBO_NAMES.POKER,
        points: 50 + value
      })

      results.school = { face: value, points: value }
    }
  } else {
    // проверить на стриты
    let sum = values.reduce((acc, cur) => acc + cur)
    if (sum == 15) {
      results.combos.push({
        name: COMBO_NAMES.SMALL_STRAIGHT,
        points: sum
      })
    }
    else if (sum == 20) {
      results.combos.push({
        name: COMBO_NAMES.BIG_STRAIGHT,
        points: sum
      })
    }
  }

  // if (results.combos.length > 1) {
  //   results.combos.sort((a, b) => a.points < b.points ? -1 : a.points > b.points ? 1 : 0)
  // }

  let onePairCombos = results.combos.filter(v => v.name == COMBO_NAMES.ONE_PAIR)
  if (onePairCombos.length > 1) {
    onePairCombos.sort((a, b) => a.points < b.points ? 1 : a.points > b.points ? -1 : 0)
    results.combos = results.combos.filter(v => v.name == COMBO_NAMES.ONE_PAIR ? v.points == onePairCombos[0].points : true)
  }

  if (serial == 1) {
    results.combos.forEach(v => {
      v.points *= 2
    })
  }

  results.combos.push({
    name: COMBO_NAMES.SUM,
    points: values.reduce((acc, cur) => acc + cur)
  })

  if (results.school) {
    results.combos.push({
      name: SCHOOL_NAMES[results.school.face],
      points: results.school.points
    })
    results.school.name = SCHOOL_NAMES[results.school.face]
  }

  return results
}

function getAmountCastsOfPoker () {
  let n = 0, getted = false

  function tryGetPoker () {
    let shot = ENGINE.makeShot()
    return shot[0] == shot[1] == shot[2] == shot[3] == shot[4]
  }

  do {
    n++
    getted = tryGetPoker()
  } while (!getted)

  return n
}

function getAverageAmountOfCastOfPoker () {
  let arr = []

  do {
    arr.push(getAmountCastsOfPoker())
  } while (arr.length < 10000)

  return arr.reduce((acc, cur) => acc + cur) / arr.length
}

// tests
// let shot = makeShot()
// console.log(getCombos(shot))
// console.log('one pair:', getCombos([6,6,5,4,3]))
// console.log('set:', getCombos([6,6,6,5,4]))
// console.log('two pairs:', getCombos([6,6,5,5,4]))
// console.log('full house:', getCombos([6,6,6,5,5]))
// console.log('small straight:', getCombos([1,2,3,4,5]))
// console.log('big straight:', getCombos([2,3,4,5,6]))
// console.log('quads:', getCombos([6,6,6,6,5]))
// console.log('poker:', getCombos([6,6,6,6,6]))

module.exports = {
  DICES_AMOUNT,
  DICE_FACES_AMOUNT,
  ITEM_NAMES,
  SCHOOL_NAMES,
  COMBO_NAMES,
  getRandomDiceFace,
  makeShot,
  getCombos,
  initTable
}