let express = require('express');
let router = express.Router();
const md5 = require('blueimp-md5');
const {UserModel} = require('../db/models');
const filter = {password: 0, __v: 0}
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
router.post('/register',(req,res)=>{
  const {username,password,type} = req.body;
    UserModel.findOne({username},filter,(err,userDoc)=>{
      if(!err && userDoc){
        res.send({code: 1, msg: '此用户已存在'})
      }else{
        new UserModel({username,password: md5(password),type}).save(function (err,user) {
            if(!err && user){
              res.cookie("user_id",user._id,{maxAge:1000*3600*24*7})
              console.log("数据保存成功");
              res.send({code: 0, data: {_id: user._id, username, type}})
            }
        });
      }
    })
});
router.post('/login', function (req, res) {

    const {username, password} = req.body

    UserModel.findOne({username, password: md5(password)}, filter, function (err, user) {
        if(!user) {
            res.send({code: 1, msg: '用户名或密码错误'})
        } else {
            res.cookie('user_id', user._id, {maxAge: 1000*60*60*24*7})
            res.send({code: 0, data: user}) // user中没有pwd
        }
    })
});
router.post('/update',function (req,res) {
    /*获取cookie得值*/
    const userid =req.cookies('user_id');
    if(!userid){
      res.send({code:1,msg:'请先登录'})
    }
    UserModel.findByIdAndUpdate({_id:userid},req.data,function (err,user) {
        const {_id,username,type} = user;
        /*合并新老数据*/
        const data = Object.assign(...req.body,{_id,username,type});
        res.send({code:0,data})

    })
});
router.get('/user',function (req,res) {
    const userid =req.cookies('user_id')
    if(!userid){
        return res.send({code:1,msg:'请先登录'})
    }
    UserModel.findOne({_id:userid},filter,(err,user)=>{
        return res.send({code: 0, data: user})
    })
})
module.exports = router;
