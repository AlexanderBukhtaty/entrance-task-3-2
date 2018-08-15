var inputData = require('./data/input.json');

const maxPower = 2100;      // Максимальная мощность сети

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


var hoursSortedByRate = getHoursArray(inputData.rates.sort((a, b) => a.rate - b.rate).reverse());
var devicesSorteredByPower = [...inputData.devices].sort((a, b) => a.power - b.power).reverse();


// Логика расчета девайсов используемых в конкретный час
(function() {

    let usage = {};

    for (hour of hoursSortedByRate.hours) {
        let currentPower = 0;
        hour['items'] = [];

        for (device of devicesSorteredByPower) {
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

console.log(adapter(hoursSortedByRate.hours));