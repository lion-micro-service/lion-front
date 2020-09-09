// 默认利用axios的cancelToken进行防重复提交。
// 如需允许多个提交同时发出。则需要在请求配置config中增加 neverCancel 属性，并设置为true
import axios from 'axios';
import { message } from 'ant-design-vue'


/* 防止重复提交，利用axios的cancelToken */
let pending: any[] = []; // 声明一个数组用于存储每个ajax请求的取消函数和ajax标识

const CancelToken: any = axios.CancelToken;

const removePending: any = (config: any, f: any) => {
    // 获取请求的url
    const flagUrl = config.url;
    // 判断该请求是否在请求队列中
    if (pending.indexOf(flagUrl) !== -1) {
        // 如果在请求中，并存在f,f即axios提供的取消函数
        if (f) {
            f('cancelDuplicateRequest'); // 执行取消操作
        } else {
            pending.splice(pending.indexOf(flagUrl), 1); // 把这条记录从数组中移除
        }
    } else {
        // 如果不存在在请求队列中，加入队列
        if (f) {
            pending.push(flagUrl);
        }
    }
};
/* 创建axios实例 */
const service = axios.create({
    baseURL: process.env.VUE_APP_BASEURL,
    timeout: 5000 // 请求超时时间
});

/* request拦截器 */
service.interceptors.request.use((config: any) => {
    // neverCancel 配置项，允许多个请求
    if (!config.neverCancel) {
        // 生成cancelToken
        config.cancelToken = new CancelToken((c: any) => {
            removePending(config, c);
        });
    }
    const token = sessionStorage.getItem("token");
    if (token && token !== ''){
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error: any) => {
    // @ts-ignore
    Promise.reject(error);
});

/* respone拦截器 */
service.interceptors.response.use(
    (response: any) => {
        // 移除队列中的该请求，注意这时候没有传第二个参数f
        removePending(response.config);
        // 获取返回数据，并处理。
        if (response.data.status === 403){
            message.error('登陆异常，请重新登陆！');
            setTimeout(function () {
                if (self != top) {
                    window.top.location.href="/";
                }else {
                    window.location.href="/";
                }
            },5000);
        }else if (response.data.status !== 200) {
            if(response.data.message){
                message.error(response.data.message);
            }else if(response.data.exceptionMessage){
                message.error(response.data.exceptionMessage);
            }else{
                message.error('未知错误！请联系管理员！');
            }
        }
        return response.data;
    },
    (error: any) => {
        // 异常处理
        message.error(error);
        pending = [];
        if (error.message === 'cancelDuplicateRequest') {
            // @ts-ignore
            return Promise.reject(error);
        }
        // @ts-ignore
        return Promise.reject(error);
    },
);
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default service;