let express = require('express');
let router = express.Router();
const md5 = require('blueimp-md5');
const {UserModel,ChatModel} = require('../db/models');
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
              res.cookie("userid",user._id,{maxAge:1000*3600*24*7})
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
            res.cookie('userid', user._id, {maxAge: 1000*60*60*24*7})
            res.send({code: 0, data: user}) // user中没有pwd
        }
    })
});
router.post('/update', function (req, res) {
    // 从请求的cookie得到userid
    const userid = req.cookies.userid
    // 如果不存在, 直接返回一个提示信息
    if(!userid) {
        return res.send({code: 1, msg: '请先登陆'})
    }
    // 存在, 根据userid更新对应的user文档数据
    // 得到提交的用户数据
    const user = req.body // 没有_id
    UserModel.findByIdAndUpdate({_id: userid}, user, function (error, oldUser) {

        if(!oldUser) {
            // 通知浏览器删除userid cookie
            res.clearCookie('userid')
            // 返回返回一个提示信息
            res.send({code: 1, msg: '请先登陆'})
        } else {
            // 准备一个返回的user数据对象
            const {_id, username, type} = oldUser
            const data = Object.assign({_id, username, type}, user)
            // 返回
            res.send({code: 0, data})
        }
    })
})
router.get('/user', function (req, res) {
    // 从请求的cookie得到userid
    const userid = req.cookies.userid
    // 如果不存在, 直接返回一个提示信息
    if(!userid) {
        return res.send({code: 1, msg: '请先登陆'})
    }
    // 根据userid查询对应的user
    UserModel.findOne({_id: userid}, filter, function (error, user) {
        if(user) {
            res.send({code: 0, data: user})
        } else {
            // 通知浏览器删除userid cookie
            res.clearCookie('userid')
            res.send({code: 1, msg: '请先登陆'})
        }

    })
});
router.get('/userlist',function(req,res){
    const {type} = req.query;
    console.log(type)
    UserModel.find({type}, filter, function (error, users) {
        console.log(users)
        res.send({code: 0, data: users})
    })
});
// 引入UserModel,ChatModel
/*
获取当前用户所有相关聊天信息列表
 */
router.get('/msglist', function (req, res) {
    // 获取cookie中的userid
    const userid = req.cookies.userid
    // 查询得到所有user文档数组
    UserModel.find(function (err, userDocs) {
        // 用对象存储所有user信息: key为user的_id, val为name和header组成的user对象
        const users = {} // 对象容器
        userDocs.forEach(doc => {
            users[doc._id] = {username: doc.username, header: doc.header}
        })
        /*
        查询userid相关的所有聊天信息
         参数1: 查询条件
         参数2: 过滤条件
         参数3: 回调函数
        */
        ChatModel.find({'$or': [{from: userid}, {to: userid}]}, filter, function (err, chatMsgs) {
            // 返回包含所有用户和当前用户相关的所有聊天消息的数据
            console.log(chatMsgs);
            res.send({code: 0, data: {users, chatMsgs}})
        })
    })
})

/*
修改指定消息为已读
 */
router.post('/readmsg', function (req, res) {
    // 得到请求中的from和to
    const from = req.body.from
    const to = req.cookies.userid
    /*
    更新数据库中的chat数据
    参数1: 查询条件
    参数2: 更新为指定的数据对象
    参数3: 是否1次更新多条, 默认只更新一条
    参数4: 更新完成的回调函数
     */
    ChatModel.update({from, to, read: false}, {read: true}, {multi: true}, function (err, doc) {
        console.log('/readmsg', doc)
        res.send({code: 0, data: doc.nModified}) // 更新的数量
    })
})

module.exports = router;
