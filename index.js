var inputData = require('./data/input.json');

const maxPower = 2100;      // Максимальная мощность сети
var dayInterval = [7,21];   // Дневной интервал
var nightInterval = [21,7]; // Ночной интервал

// Формирует массив часов и их тарификация
function getHoursArray(rates) {

    var result = {
        hours: []
    };

    for (rate of rates) {

        var countHourDifference = (from, to) => {
            var result = from < to ? to - from : (24 - from) + to;
            return result;
        };

        for (let i = 0; i < countHourDifference(rate.from, rate.to); i++) {
            var hourDiff = countHourDifference(rate.from, rate.to);
            result.hours.push({
                id: rate.from + i <= 24 ? rate.from + i : (rate.from + i) - 24,
                rate: rate.value
            })
        }
    }

    return result;
}

function checkDeviceMode(mode, time) {
    switch(mode) {
        case 'day': return dayInterval[0] <= time && time < dayInterval[1];
        case 'night': return nightInterval[0] <= time && (24 - time) < nightInterval[1];
        default: return true;
    }
}

// Преобразует вычисленные данные к нужному виду
function adapter(inputHours) {
    
    let hours = [...inputHours];
    
    let result = {
        schedule: {},
        consumedEnergy: {
            value: 0,
            devices: {}
        }
    }

    hours.sort((a, b) => a.id - b.id).forEach((hour, idx) => {

        result.schedule[idx] = hour.items.map(device => {
            if(!result.consumedEnergy.devices[device.id]) result.consumedEnergy.devices[device.id] = 0;
            let coast = hour.rate * (device.power / 1000);
            result.consumedEnergy.devices[device.id] = Number((result.consumedEnergy.devices[device.id] + coast).toFixed(4));
            return device.id;
        });

    });
    
    result.consumedEnergy.value = Object.keys(result.consumedEnergy.devices).reduce((sum, key) => {
        return Number((sum + result.consumedEnergy.devices[key]).toFixed(4));
    }, 0);
    
    return result;
}

// Получаем отсортированные по тарифу часы и отсортированные по потреблению устройства
var hoursSortedByRate = getHoursArray(inputData.rates.sort((a, b) => a.rate - b.rate).reverse());
var devicesSorteredByPower = [...inputData.devices].sort((a, b) => a.power - b.power).reverse();


// Логика расчета девайсов используемых в конкретный час
(function() {

    let usage = {};

    for (hour of hoursSortedByRate.hours) {
        let currentPower = 0;
        hour['items'] = [];

        for (device of devicesSorteredByPower) {
            if(device.mode && !checkDeviceMode(device.mode, hour.id)) continue;
            usage[device.id] = usage[device.id] ? usage[device.id] : 0;

            if (usage[device.id] >= 0 && usage[device.id] < device.duration) {

                if (currentPower + device.power <= maxPower) {
                    usage[device.id]++;
                    currentPower += device.power;
                    hour['items'].push(device);
                }
            }
        }
    }
})();
// 
console.log(adapter(hoursSortedByRate.hours));

// Проверка на количество запусков устройства
function checkDeviceLaunching (schedule) {
    var tst = {};
    var count = schedule.forEach((day) => {
      day.items.forEach((device) => {
        tst[device.id] ? tst[device.id] : tst[device.id] = 0;
        tst[device.id] += 1;
      })
    });
    
    let hasError = false
    let i = 0;
    while(!hasError && i < inputData.devices.lenght) {
        hasError = inputData.devices[i].duration == tst[inputData.devices[i].id] ? false : true;
        i++;
    }
    hasError ? console.error('checkDeviceLaunching: не совпадает количество запусков') : console.log('checkDeviceLaunching: все гуд') ;
}
checkDeviceLaunching (hoursSortedByRate['hours']);
// Проверка мощности каждого устройства
function checkDevicePower(devices) {
    let hasError = false;
    let i = 0;
    while(!hasError && i < devices.lenght) {
        hasError = devices[i].power <= maxPower ? false : true;
        i++;
    }    
    hasError ? console.error('checkDevicePower: Потребление устроства выше maxPower') : console.log('checkDevicePower: все гуд') ;        
}
checkDevicePower(inputData.devices);