const { createPow } = require('@textile/powergate-client')
const host = "http://58.144.221.21:6002"
const pow = createPow({ host })
//引入mysql模块
var mysql = require('mysql');
//创建数据库连接
var connection = mysql.createConnection({
  host: '45.32.19.182',
  user: 'root',
  password: 'ss6522011',
  database: 'ipfs_scholar_db'
});
//执行sql代码
const exec = (sql) => {
  const promise = new Promise((resolve, reject) => {
    connection.query(sql, (err, result) => {
      resolve(result);
    })
  })
  return promise;
}


module.exports = {

  // health.check()
  checkHealth: async function () {
    this.definePow()
    const { health } = await pow.health.check();
    return health;
  },


  // get wallet addresses
  getWalletAddresses: async function () {
    const { token } = await pow.ffs.create();
    pow.setToken(token)
    const { addrsList } = await pow.ffs.addrs();
    return addrsList;
  },
  
  connectDb: function () {
    return exec;
  },

  closeDb:function(){
    connection.end();
    console.log("close db success!")
  },


  getFileType:function(fileName){
    return fileName.substr(fileName.length-3,3);
  },
  
};