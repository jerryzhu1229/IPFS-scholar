const express = require('express');
var bodyParser = require('body-parser');
var bcrypt = require('bcryptjs');
var { SECRET, EXPIRESD } = require('./core/store')
const jwt = require('jsonwebtoken');
const app = express();
const path = require('path');
const { createPow } = require('@textile/powergate-client')
const host = "http://58.144.221.21:6002"
//const host = "http://209.250.244.189:6002"
const pow = createPow({ host })
const func = require('./function.js')
const fs = require('fs');
const formidable = require('formidable');
const User = require('./core/user');
const File = require('./core/file');
const exec = func.connectDb();
const JobStatus = require("@textile/grpc-powergate-client/dist/ffs/rpc/rpc_pb");

app.use(bodyParser.json({ limit: "1mb" }));
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

app.listen(3000, () => {
    console.log("3000 listening");
});
app.post('/test',async (req, res, _) =>{

})
app.post('/userRegister', async (req, res, _) =>{
    const { token } = await pow.ffs.create()
    console.log("token: " + token)
    pow.setToken(token)
    const { info } = await pow.ffs.info()
    console.dir(info.balancesList)
    const balancesList = info.balancesList;
    res.json({balancesList})
})

app.post('/fileUpload',async (req, res,next) =>{
    console.log("-------------------------upload-----------------------------")

    //对传过来的req数据进行解析，files中是文件，fields中是一些text数据
    const form = formidable({ multiples: true });
    form.parse(req, async (err, fields, files) =>{
        if (err) {
            next(err);
            return;
        }
        console.dir(files.file);
        //得到文件的路径和姓名，token，描述
        const path = files.file.path;
        const token = fields.token;
        const classification = fields.classification;
        const walletAddr = fields.walletAddr;
        const filename=files.file.name;
        const filesize=files.file.size;


        if (token == undefined) {
            res.json({ "code": 422, "msg": "You are not logged in,Please login first" });
            res.redirect("/login");
            return;
        }
        pow.setToken(token);
        const buffer = fs.readFileSync(path)
        try {
            const { cid } = await pow.ffs.stage(buffer)
            console.log("cid: " + cid)
            var sql = `INSERT INTO fileinfo VALUES('${cid}','${classification}','${walletAddr}')`
      //     var sql = `INSERT INTO fileinfo VALUES('${cid}','${walletAddr}',"f09731",'${filename}','${filesize}','${classification}',unix_timestamp(now()),'${content}','${title}')`
            exec(sql).then(async (result) => {
                if (result != undefined && result.length != 0) {
                    //提交订单申请上传到filecoin
                    try {
                        const { jobId } = await pow.ffs.pushStorageConfig(cid)
                        console.log("jobId:" + jobId)

                        if (jobId == undefined) {
                            res.json({
                                "code": 500,
                                "msg": "Failed to upload the file!Please try again!"
                            })
                            return;
                        }

                        const { config } = await pow.ffs.getStorageConfig(cid);
                        console.dir(config);
                        res.json({
                            "code":200,
                            "data":config
                        })
                    } catch (e) {
                        console.log(e)
                        res.json({
                            "code": 422,
                            "msg": e
                        })
                    }

                } else {
                    res.json({
                        "code": 500,
                        "msg": "Failed to store to database!Maybe the file has been stored already!"
                    })
                    return;
                }
            })
        } catch (error) {
            console.log(error)
            res.json({
                "code": 500,
                "msg": error
            })
            return;
        }
        
    })
})
app.post('/getWallet',async (req,res,_)=>{
    const token = req.body.token;
    pow.setToken(token);
    const { info } = await pow.ffs.info()
    console.dir(info.balancesList)
   
})
app.post('/sendFil',async (req,res,_)=>{
    console.log("-------------------------sendFil-----------------------------")

    const from = req.body.from;
    const to = req.body.to;
    const amnt = req.body.amnt;
    const token = req.body.token;

    try {
        pow.setToken(token);
        
        await pow.ffs.sendFil(from, to, amnt);
        
        res.json({
            "code":200,
            "msg":"send ok   "
        })
    } catch (e) {
        console.log(e)
        res.json({
            "code": 500,
            "msg": e
        })
    }

})

app.post('/setConfig', async (req, res, _) => {
    const token = req.body.token;
    const reqconfig = req.body.reqconfig;
    pow.setToken(token);
    await pow.ffs.setDefaultStorageConfig(reqconfig)
   // console.log(config)
    res.json({
        "code": 200
    })

})