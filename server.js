Constexpress=require('express');
Constbcrypt=require('bcryptjs');
ConstJWT=require('jsonwebtoken');
Constcors=require('cors');
Constpath=require('path');
ConstDB=require('./database');

Const应用程序=express();
Const港口=process.env.港口||3000;
ConstJWT_SECRET=process.env.JWT_SECRET||'my-secret-key-2024';

应用程序.use(cors());
应用程序.use(express.JSON());
应用程序.use(express.static(path.join(__dirname, 'public')));

// 认证中间件
function authMiddleware(req, res, 下一个) {
  ConstauthHeader=req.headers['authorization'];
  Const令牌=authHeader && authHeader.split(' ')[1];
  如果 (!令牌) 返回 res.状态(401).JSON({ 误差: '未登录' });
  JWT.verify(令牌, JWT_SECRET, (犯错, 用户)=>{
    如果 (犯错) 返回 res.状态(403).JSON({ 误差: '登录过期' });
    req.用户=用户;
    下一个();
  });
}

// 注册
应用程序.邮件('/api/register', 异步 (req, res)=>{
  尝试 {
    Const{ 用户名, 密码 }=req.身体;
    如果 (!用户名|| !密码) 返回 res.状态(400).JSON({ 误差: '请输入用户名和密码' });
    如果 (密码.长度<6) 返回 res.状态(400).JSON({ 误差: '密码至少6位' });
    ConsthashedPassword=等候 bcrypt.哈希(密码, 10);
    DB.准备('插入用户(用户名、密码、余额)值(？ 、？ 、100)').跑(用户名, hashedPassword);
    res.JSON({ 成功: 正确, 消息: '注册成功！赠送100积分' });
  } 赶上 (犯错) {
    如果 (犯错.消息.包括('独特')) 返回 res.状态(400).JSON({ 误差: '用户名已存在' });
    res.状态(500).JSON({ 误差: '服务器错误' });
  }
});

// 登录
应用程序.邮件('/api/login', 异步 (req, res)=>{
  尝试 {
    Const{ 用户名，密码 }=req.身体;
    Const用户=DB.准备('select*FROM users，其中username=？').得到(用户名);
    如果 (!用户) 返回 res.状态(400).JSON({ 误差: '用户不存在' });
    Constvalid=等候 bcrypt.比较(密码, 用户.密码);
    如果 (!有效的) 返回 res.状态(400).JSON({ 误差: '密码错误' });
    康斯托克肯=JWT.标志({ 身份标识: 用户.身份标识, 用户名: 用户.用户名 }, JWT_SECRET, { expiresIn: '7d' });
    res.JSON({ 令牌, 用户: { 身份标识: 用户.身份标识, 用户名: 用户.用户名, 平衡: 用户.平衡 } });
  } 赶上 (犯错) {
    res.状态(500).JSON({ 误差: '服务器错误' });
  }
});

// 获取用户信息
应用程序.得到('/api/user', authMiddleware, (req, res)=>{
  Const用户=DB.准备('选择ID、用户名、余额来自用户，其中id=？').得到(req.用户.身份标识);
  res.JSON(用户);
});

// 获取武器列表
应用程序.得到('/api/武器', (req, res)=>{
  Constweapons=DB.准备('从武器中选择*').所有();
  res.JSON(武器);
});

// 开箱
应用程序.邮件('/api/open-case', authMiddleware, (req, res)=>{
  Const{ caseType='标准' }=req.身体;
  ConstuserId=req.用户.身份标识;
  Constrprices={ 标准: 20, 保险费: 50 };
  Constprice=价格[caseType]||20;

  Const用户=DB.准备('从id=？的用户中选择余额').得到(userId);
  如果 (用户.平衡<价格) 返回 res.状态(400).JSON({ 误差: '余额不足' });

  Constweapons=DB.准备('从武器中选择*').所有();
  ConsttotalChance=武器.减少((总和, w)=>总和+w.机会, 0);
  让兰德=数学.随机() * totalChance;
  让wonWeapon=武器[武器.长度 - 1];
  为 (Const武器……的武器) {
    兰德-=武器.机会;
    如果 (兰德<=0) { wonWeapon=武器; 打破; }
  }

  Const交易=DB.交易(()=>{
    DB.准备('更新用户set balance=balance-？其中id=？').跑(价格, userId);
    DB.准备('插入库存(用户ID，武器ID)值(？，？)').跑(userId, wonWeapon.身份标识);
    DB.准备('插入历史记录(用户ID，武器ID，案例类型)值(？，？，？)').跑(userId，wonWeapon.身份标识, caseType);
  });
  交易();

  ConstNewBalance=DB.准备('从id=？的用户中选择余额').得到(userId).平衡;
  res.JSON({ 成功: 正确, 武器: wonWeapon, 平衡: NewBalance });
});

// 库存
应用程序.得到('/api/库存', authMiddleware, (req, res)=>{
  Const项目=DB.准备(`
选择i.id、i.botained_at、w.name、w.rarity、w.color
从清单i加入武器w.awar_id=w.id
其中，i.user_id=？i.botted_at DESC LIMIT50的订单
`).所有(req.用户.身份标识);
  res.JSON(项目);
});

// 历史
应用程序.得到('/api/history', authMiddleware, (req, res)=>{
  Const项目=DB.准备(`
选择h.opened_at、h.case_type、w.name、w.rarity、w.color
从历史h加入武器w.waron_id=w.id
其中h.user_id=？由h.opened_at DESC LIMIT30订购
`).所有(req.用户.身份标识);
  res.JSON(项目);
});

应用程序.听(港口, ()=>{
  控制台.日志('服务器已启动，端口：'+港口);
);)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；)；；
