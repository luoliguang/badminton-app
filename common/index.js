// 此目录是云函数共享工具库，不作为独立云函数调用
exports.main = async () => ({ code: 404, message: '此函数不对外提供服务' })
