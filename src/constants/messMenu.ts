/**
 * Mess Menu Dataset parsed 100% accurately from Menu_Finalized_26_27.pdf
 * Organized by Week Type ('even' | 'odd'), Day of Week ('SUNDAY'..'SATURDAY'), and Meal ('breakfast' | 'lunch' | 'snacks' | 'dinner').
 */

export type MealType = 'breakfast' | 'lunch' | 'snacks' | 'dinner';
export type WeekType = 'even' | 'odd';
export type DayName = 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';

export interface MealItem {
  main: string[];
  accompaniments: string[];
  extras?: string[];
  beverage?: string;
  dessert?: string;
}

export type DayMenu = Record<MealType, MealItem>;
export type WeekMenu = Record<DayName, DayMenu>;

export const MESS_MENU: Record<WeekType, WeekMenu> = {
  even: {
    SUNDAY: {
      breakfast: {
        main: ['Onion Carrot Uttapam'],
        accompaniments: ['Sambar', 'Coconut Chutney', 'BBJ', 'Sprouts'],
        extras: ['Seasonal Cut Fruits*** / Boiled Egg (1)'],
        beverage: 'Tea / Coffee / Milk',
      },
      lunch: {
        main: ['Tawa Chapathi', 'Sev Tomato Gravy', 'Hyderabadi Paneer Biryani / Hyderabadi Chicken Biryani'],
        accompaniments: ['Raita', 'Salad', 'Onion'],
        dessert: 'Ice Cream (1)',
      },
      snacks: {
        main: ['Bhel Puri'],
        accompaniments: [],
        beverage: 'Tea / Coffee / Milk / Boost',
      },
      dinner: {
        main: ['Peanut Coconut Rice', 'Veg Kurma', 'Phulka', 'Gutti Vankaya Curry'],
        accompaniments: ['Curd'],
        dessert: 'Gulab Jamun (2)',
      },
    },
    MONDAY: {
      breakfast: {
        main: ['Poori', 'Aloo Masala Curry'],
        accompaniments: ['BBJ', 'Boiled Groundnuts'],
        extras: ['Banana (1) / Boiled Egg (1)'],
        beverage: 'Tea / Coffee / Milk',
      },
      lunch: {
        main: ['Pulkha', 'Garlic Tomato Curry', 'Kerala Sadiya Avial'],
        accompaniments: ['Rice', 'Vatha Kolambu', 'Curd', 'Fryums', 'Pickle', 'Ghee', 'Podi', 'Seasonal Fruit Juice', 'Onion'],
      },
      snacks: {
        main: ['Sundal (Boiled Channa Black / Boiled Green Gram Dal)'],
        accompaniments: [],
        beverage: 'Tea / Coffee / Milk / Raagi Malt',
      },
      dinner: {
        main: ['Tawa Chapathi', 'Channa Masala'],
        accompaniments: ['Rice', 'Sambar', 'Rasam', 'Cauliflower Peas Poriyal', 'Buttermilk', 'Fryums'],
        dessert: 'Boondi Laddu (1)',
      },
    },
    TUESDAY: {
      breakfast: {
        main: ['Ragi Dosa', 'Upma'],
        accompaniments: ['Sambar', 'Groundnut Chutney', 'BBJ', 'Sprouts'],
        extras: ['Seasonal Cut Fruits*** / Boiled Egg (1)'],
        beverage: 'Tea / Coffee / Milk',
      },
      lunch: {
        main: ['Tawa Chapathi', 'Dum Aloo', 'Andhra Tomato Dal', 'Greens Poriyal'],
        accompaniments: ['Jeera Rice', 'Rice', 'Rasam', 'Curd', 'Papad', 'Pickle', 'Ghee', 'Podi', 'Salad', 'Onion'],
      },
      snacks: {
        main: ['Onion Pakoda'],
        accompaniments: [],
        beverage: 'Tea / Coffee / Milk / Boost',
      },
      dinner: {
        main: ['Idli', 'Sambar', 'Karam Podi', 'Tomato Onion Chutney', 'Ghee', 'Lemon Rice', 'Curd Rice', 'Potato Poriyal'],
        accompaniments: ['Pickle'],
        dessert: 'Sweet Pongal***',
      },
    },
    WEDNESDAY: {
      breakfast: {
        main: ['Masala Dosa'],
        accompaniments: ['Sambar', 'Tomato Onion Chutney', 'BBJ', 'Boiled Groundnuts'],
        extras: ['Banana (1) / Boiled Egg (1)'],
        beverage: 'Tea / Coffee / Milk',
      },
      lunch: {
        main: ['Pulkha', 'Yellow Channa Dal Masala', 'Kovakai Fry'],
        accompaniments: ['Rice', 'Sambar', 'Rasam', 'Curd', 'Fryums', 'Pickle', 'Ghee', 'Podi', 'Seasonal Fruit Juice', 'Onion'],
      },
      snacks: {
        main: ['Banana Bajji (3)'],
        accompaniments: ['Kadalai Chutney'],
        beverage: 'Tea / Coffee / Milk / Raagi Malt',
      },
      dinner: {
        main: ['SPECIAL DINNER (Veg / Non-Veg)'],
        accompaniments: ['Naan / Roti with Paneer / Chicken', 'Hyderabadi Veg Biryani / Pulao', 'Raita', 'Lemon Juice'],
        extras: ['Assorted Fruits (Apple, Banana, Grapes, Papaya, Pomegranate, Guava)'],
        dessert: 'Ice Cream / Fruit Custard',
      },
    },
    THURSDAY: {
      breakfast: {
        main: ['Upma', 'Poha', 'Mysore Bonda (3)'],
        accompaniments: ['Coconut Chutney', 'BBJ', 'Sprouts'],
        extras: ['Seasonal Cut Fruits*** / Boiled Egg (1)'],
        beverage: 'Tea / Coffee / Milk',
      },
      lunch: {
        main: ['Tawa Chapathi', 'Paneer Peas Curry', 'Spinach Kootu'],
        accompaniments: ['Rice', 'Sambar', 'Rasam', 'Curd', 'Fryums', 'Pickle', 'Ghee', 'Podi', 'Salad', 'Onion'],
      },
      snacks: {
        main: ['Sweet Corn (Half piece - 6cm)'],
        accompaniments: [],
        beverage: 'Tea / Coffee / Milk / Boost',
      },
      dinner: {
        main: ['Tawa Chapathi', 'Veg Biryani', 'Aloo Curry', 'Bagara Rice', 'Black Channa Curry'],
        accompaniments: ['Raita', 'Buttermilk'],
        dessert: 'Pineapple Kesari***',
      },
    },
    FRIDAY: {
      breakfast: {
        main: ['Rava Idly', 'Vada (3)'],
        accompaniments: ['Sambar', 'Tomato Onion Chutney', 'BBJ', 'Boiled Groundnuts'],
        extras: ['Banana (1) / Boiled Egg (1)'],
        beverage: 'Tea / Coffee / Milk',
      },
      lunch: {
        main: ['Phulka', 'Aloo Masala Curry', 'Hyderabadi Veg Pulao'],
        accompaniments: ['Raita', 'Gongura Chutney', 'Papad', 'Ghee', 'Podi', 'Seasonal Fruit Juice', 'Onion'],
      },
      snacks: {
        main: ['Mix Veg Maggi (130g)'],
        accompaniments: ['Tomato Sauce'],
        beverage: 'Tea / Coffee / Milk / Raagi Malt',
      },
      dinner: {
        main: ['Chole Bature', 'Idiyappam', 'Plain Rice', 'Mixed Dal'],
        accompaniments: ['Buttermilk', 'Onion'],
        dessert: 'Paruppu Payasam with Jaggery',
      },
    },
    SATURDAY: {
      breakfast: {
        main: ['Methi Paratha', 'Kabuli Channa Masala'],
        accompaniments: ['BBJ', 'Sprouts'],
        extras: ['Seasonal Cut Fruits*** / Boiled Egg (1)'],
        beverage: 'Tea / Coffee / Milk',
      },
      lunch: {
        main: ['Tawa Chapathi', 'Baigan Methi Curry', 'Chilli Soya Bean Dry***', 'Perugu Pachadi'],
        accompaniments: ['Rice', 'Sambar', 'Rasam', 'Papad', 'Pickle', 'Ghee', 'Podi', 'Banana Juice', 'Onion'],
      },
      snacks: {
        main: ['Aloo Samosa (2)'],
        accompaniments: ['Mint Chutney', 'Tomato Sauce'],
        beverage: 'Tea / Coffee / Milk / Boost',
      },
      dinner: {
        main: ['Millet Dosa'],
        accompaniments: ['Peanut Chutney', 'Buttermilk', 'Papad'],
        dessert: 'Bread Halwa***',
      },
    },
  },
  odd: {
    SUNDAY: {
      breakfast: {
        main: ['Rava Dosa', 'Semiya Upma'],
        accompaniments: ['Sambar', 'Groundnut Chutney', 'BBJ', 'Boiled Groundnuts'],
        extras: ['Seasonal Cut Fruits*** / Boiled Egg (1)'],
        beverage: 'Tea / Coffee / Milk',
      },
      lunch: {
        main: ['Tawa Chapathi', 'Palak Paneer Curry / Chicken Curry', 'Veg Biryani'],
        accompaniments: ['Raita', 'Salad', 'Onion'],
        extras: ['Seasonal Fruit Juice'],
        dessert: 'Badusha (1) / Ice Cream (1)',
      },
      snacks: {
        main: ['Pani Puri (6)'],
        accompaniments: ['Green Chutney', 'Tamarind Chutney'],
        beverage: 'Tea / Coffee / Milk / Raagi Malt',
      },
      dinner: {
        main: ['Chapatti', 'Mix Veg Curry (Punjabi style)', 'Tamarind Rice', 'Aloo Bhujiya Sabhji'],
        accompaniments: ['Buttermilk', 'Fryums', 'Pickle'],
        extras: ['Seasonal Cut Fruits***', 'Turmeric Milk'],
      },
    },
    MONDAY: {
      breakfast: {
        main: ['Pongal', 'Vada (3)'],
        accompaniments: ['Sambar', 'Coconut Chutney', 'BBJ', 'Sprouts'],
        extras: ['Banana (1) / Boiled Egg (1)'],
        beverage: 'Tea / Coffee / Milk',
      },
      lunch: {
        main: ['Pulkha', 'Dal Makhani', 'Plantain Poriyal'],
        accompaniments: ['Rice', 'Sambar', 'Rasam', 'Curd', 'Pickle', 'Papad', 'Ghee', 'Podi', 'Seasonal Fruit Juice', 'Onion'],
      },
      snacks: {
        main: ['Pasta'],
        accompaniments: [],
        beverage: 'Tea / Coffee / Milk / Boost',
      },
      dinner: {
        main: ['Chole Bature', 'Rice'],
        accompaniments: ['Onion Mirch Salad', 'Snake Gourd Kootu', 'Curd', 'Rasam'],
        extras: ['Banana (1)'],
      },
    },
    TUESDAY: {
      breakfast: {
        main: ['Wheat Dosa / Pesarattu'],
        accompaniments: ['Sambar', 'Tomato Onion Chutney', 'BBJ', 'Boiled Groundnuts'],
        extras: ['Seasonal Cut Fruits*** / Boiled Egg (1)'],
        beverage: 'Tea / Coffee / Milk',
      },
      lunch: {
        main: ['Tawa Chapathi', 'Dum Aloo', 'Beans Carrot Poriyal'],
        accompaniments: ['Rice', 'Panchratan Dal', 'Rasam', 'Curd', 'Fryums', 'Pickle', 'Ghee', 'Podi', 'Salad', 'Onion'],
      },
      snacks: {
        main: ['Masala Vada (3)'],
        accompaniments: ['Pottukadalai Chutney'],
        beverage: 'Tea / Coffee / Milk / Raagi Malt',
      },
      dinner: {
        main: ['Tawa Chapathi', 'Channa Masala', 'Rice'],
        accompaniments: ['Sambar', 'Beetroot Poriyal', 'Buttermilk', 'Fryums'],
        dessert: 'Bread Halwa',
      },
    },
    WEDNESDAY: {
      breakfast: {
        main: ['Puri', 'Channa Masala'],
        accompaniments: ['BBJ', 'Sprouts'],
        extras: ['Banana (1) / Boiled Egg (1)'],
        beverage: 'Tea / Coffee / Milk',
      },
      lunch: {
        main: ['Pulkha', 'Soya Curry', 'Onion Pakoda***', 'Perugu Pachadi'],
        accompaniments: ['Rice', 'Rasam', 'Puli Kolambu', 'Papad', 'Cabbage Moongdal Coconut Poriyal', 'Pickle', 'Ghee', 'Podi', 'Seasonal Fruit Juice', 'Onion'],
      },
      snacks: {
        main: ['Boiled Groundnuts Chat'],
        accompaniments: [],
        beverage: 'Tea / Coffee / Milk / Boost',
      },
      dinner: {
        main: ['Phulka', 'Kambu (Pearl Millet) Idli'],
        accompaniments: ['Sambar', 'Tomato Onion Chutney', 'Dal Fry', 'Buttermilk'],
        dessert: 'Sabudhana Kheer / Khulfi (1) (Malai, Pista, Mango, Strawberry)',
      },
    },
    THURSDAY: {
      breakfast: {
        main: ['Wheat Rava Upma', 'Poha', 'Mysore Bonda (3)'],
        accompaniments: ['Groundnut Chutney', 'BBJ', 'Boiled Groundnuts'],
        extras: ['Seasonal Cut Fruits*** / Boiled Egg (1)'],
        beverage: 'Tea / Coffee / Milk',
      },
      lunch: {
        main: ['Tawa Chapathi', 'Kadai Paneer***'],
        accompaniments: ['Rice', 'Masala Sambar', 'Curd', 'Fryums', 'Spinach Kootu', 'Pickle', 'Ghee', 'Podi', 'Salad', 'Onion'],
      },
      snacks: {
        main: ['Channa Chat'],
        accompaniments: [],
        beverage: 'Tea / Coffee / Milk / Raagi Malt',
      },
      dinner: {
        main: ['Flavoured Chapati', 'Paneer Kofta Curry', 'Rice'],
        accompaniments: ['Sambar', 'Rasam', 'Kovakai Poriyal', 'Salad', 'Buttermilk'],
        dessert: 'Vermicelli Payasam',
      },
    },
    FRIDAY: {
      breakfast: {
        main: ['Idli', 'Vada (3)'],
        accompaniments: ['Sambar', 'Coconut Chutney', 'BBJ', 'Sprouts'],
        extras: ['Banana (1) / Boiled Egg (1)'],
        beverage: 'Tea / Coffee / Milk',
      },
      lunch: {
        main: ['Phulka', 'Rajma Curry', 'Keerai Sambar'],
        accompaniments: ['Rice', 'Rasam', 'Curd', 'Fryums', 'Pumpkin Kootu', 'Gongura Chutney', 'Ghee', 'Podi', 'Seasonal Fruit Juice', 'Onion'],
      },
      snacks: {
        main: ['Boiled Green Moong Dal'],
        accompaniments: [],
        beverage: 'Tea / Coffee / Milk / Boost',
      },
      dinner: {
        main: ['Set Dosa', 'Veg Pulao'],
        accompaniments: ['Vada Curry', 'Raita', 'Buttermilk'],
        dessert: 'Kesari Bath***',
      },
    },
    SATURDAY: {
      breakfast: {
        main: ['Aloo Paratha', 'Channa Masala'],
        accompaniments: ['Curd', 'Pickle', 'BBJ', 'Boiled Groundnuts'],
        extras: ['Seasonal Cut Fruits*** / Boiled Egg (1)'],
        beverage: 'Tea / Coffee / Milk',
      },
      lunch: {
        main: ['Tawa Chapathi', 'Lauki Chana Dal', 'Gobi 65***'],
        accompaniments: ['Rice', 'Rasam', 'Curd', 'Tomato Andhra Dal', 'Papad', 'Plantain Stem Kootu', 'Pickle', 'Ghee', 'Podi', 'Banana Juice', 'Onion'],
      },
      snacks: {
        main: ['Millet Puttu'],
        accompaniments: [],
        beverage: 'Tea / Coffee / Milk / Raagi Malt',
      },
      dinner: {
        main: ['Pulka', 'Channa Peas Palak', 'Sambar Rice', 'Curd Rice', 'Soya Chilli'],
        accompaniments: ['Kara Boondi', 'Pickle'],
        dessert: 'Gulab Jamun (2)',
      },
    },
  },
};

export function getCurrentMealType(date: Date = new Date()): MealType {
  const hour = date.getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 18) return 'snacks';
  return 'dinner';
}

export function getMealTimeLabel(meal: MealType): string {
  switch (meal) {
    case 'breakfast': return '7:30 AM – 9:30 AM';
    case 'lunch': return '12:00 PM – 2:00 PM';
    case 'snacks': return '4:30 PM – 5:30 PM';
    case 'dinner': return '7:30 PM – 9:30 PM';
  }
}

export function getWeekNumber(date: Date = new Date()): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.round((firstThursday - target.valueOf()) / 604800000);
}

export function getWeekType(date: Date = new Date()): WeekType {
  const weekNum = getWeekNumber(date);
  return weekNum % 2 === 0 ? 'odd' : 'even';
}

export function getDayName(date: Date = new Date()): DayName {
  const DAYS: DayName[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return DAYS[date.getDay()]!;
}
