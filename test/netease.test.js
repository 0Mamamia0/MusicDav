const netease = require('../src/netease.js');
const { config } = require('../src/config.js');

// const res = netease.user_cloud(config.uid, config.cookie);
const res = netease.user_dj(config.uid, config.cookie);


res.then((res) => {
    console.log(res);
})