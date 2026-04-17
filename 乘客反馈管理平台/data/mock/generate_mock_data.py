import json
import random
from datetime import datetime, timedelta

# 基础数据配置
cities = ["深圳", "北京", "广州", "上海", "杭州", "成都", "武汉", "西安", "重庆", "南京"]
routes_by_city = {
    "深圳": [("深圳北站", "华强北"), ("南山科技园", "深圳湾口岸"), ("福田CBD", "罗湖口岸"), ("深圳机场", "市区"), ("东门", "世界之窗")],
    "北京": [("望京SOHO", "首都机场"), ("国贸", "三里屯"), ("中关村", "北京南站"), ("北京西站", "天安门"), ("颐和园", "圆明园")],
    "广州": [("天河城", "广州东站"), ("白云机场T2", "长隆度假区"), ("广州南站", "珠江新城"), ("番禺广场", "长隆"), ("琶洲", "广州塔")],
    "上海": [("陆家嘴", "虹桥枢纽"), ("外滩", "浦东机场"), ("静安寺", "徐家汇"), ("上海站", "迪士尼"), ("交大", "闵行")],
    "杭州": [("西湖银泰", "杭州东站"), ("阿里巴巴西溪园区", "西湖"), ("杭州站", "萧山机场"), ("下沙", "武林广场"), ("滨江", "龙翔桥")],
    "成都": [("春熙路", "太古里"), ("天府广场", "双流机场"), ("宽窄巷子", "锦里"), ("成都东站", "春熙路"), ("高新区", "熊猫基地")],
    "武汉": [("光谷", "武汉站"), ("汉口站", "江汉路"), ("天河机场", "武昌"), ("黄鹤楼", "户部巷"), ("楚河汉街", "东湖")],
    "西安": [("钟楼", "大雁塔"), ("西安站", "兵马俑"), ("咸阳机场", "市中心"), ("小寨", "大唐芙蓉园"), ("高新", "回民街")],
    "重庆": [("解放碑", "洪崖洞"), ("江北机场", "观音桥"), ("重庆北站", "磁器口"), ("南坪", "长江索道"), ("沙坪坝", "鹅岭")],
    "南京": [("新街口", "南京站"), ("禄口机场", "夫子庙"), ("中山陵", "总统府"), ("南京南站", "玄武湖"), ("河西", "中华门")]
}
channels = ["App", "小程序", "电话", "Web"]
statuses = ["待处理", "处理中", "已处理", "已关闭"]
status_weights = [0.3, 0.25, 0.35, 0.1]

# 7大环节的数据模板
templates = {
    "用户反馈投诉": {
        "weight": 25,
        "rating_range": (1, 3),
        "keywords": [
            ["急刹车", "安全", "传感器", "自动驾驶"],
            ["行驶平稳", "颠簸", "体验差", "投诉"],
            ["司机态度", "服务态度", "恶劣", "不耐烦"],
            ["车内温度", "空调", "太冷", "太热"],
            ["车内异味", "卫生", "清洁", "难闻"],
            ["噪音大", "隔音", "噪声", "烦躁"],
            ["突然加速", "急加速", "危险", "害怕"]
        ],
        # 短字数（5-20字）约25%
        "short_templates": [
            "车里太冷了！",
            "太差了，不推荐",
            "急刹车，差点撞上！",
            "空调形同虚设",
            "噪音大得离谱",
            "味道太重，恶心",
            "司机不理人",
            "晃得我晕车"
        ],
        # 中等字数（25-50字）约35%
        "medium_templates": [
            "今天坐车体验很差，车辆突然急刹车，差点追尾。",
            "空调温度太高，热得浑身出汗，非常不舒服。",
            "车内异味很重，像是几天没打扫过，鼻子很难受。",
            "转弯太急，身体都倾斜了，差点摔下来。",
            "司机态度冷漠，问什么都不回答，差评。"
        ],
        # 中长字数（50-100字）约25%
        "long_templates": [
            "从{route_start}到{route_end}的行程中，车辆在转弯时过于急促，身体明显倾斜，{detail}。希望技术团队能检查一下是否存在问题。",
            "今天整体体验很差，{detail}。自动驾驶的表现让人感觉不安全，尤其是在变道时判断不够准确。希望平台重视这个问题。",
            "投诉：在行驶过程中{detail}，{detail2}。作为经常使用自动驾驶服务的用户，希望这些问题能得到改善。"
        ],
        # 长字数（100-200字）约15%
        "very_long_templates": [
            "我要投诉今天的行程体验。在从{route_start}前往{route_end}的路上，车辆出现了{detail}的问题，情况非常危险。幸好没有发生事故，但当时真的非常害怕。{detail2}。希望技术团队能高度重视这个问题，彻底检查自动驾驶系统的安全性，特别是传感器识别和紧急制动等方面的表现。作为付费用户，我们希望得到最基本的安全保障。"
        ],
        "details": [
            "车辆突然急刹车，差点追尾前车",
            "转弯时过于急促，身体倾斜明显",
            "司机虽然远程监控但态度冷漠，不回应",
            "空调温度过低，冻得受不了",
            "车内有明显异味，像是没清理干净",
            "行驶中噪音很大，影响通话",
            "车辆突然加速，很不舒适",
            "变道判断不准确，差点剐蹭"
        ],
        "details2": [
            "整个行程提心吊胆",
            "完全影响了好心情",
            "希望不要再有下次了",
            "不敢再坐这个平台的车了",
            "要求给出合理解释"
        ]
    },
    "行程咨询与预约": {
        "weight": 25,
        "rating_range": (3, 5),
        "keywords": [
            ["预约", "咨询", "流程", "如何预约"],
            ["改签", "修改", "调整", "预约时间"],
            ["取消", "退订", "取消预约", "退款"],
            ["等待时间", "多久到", "预约", "时间"],
            ["上下车点", "地点", "位置", "接驾位置"]
        ],
        "short_templates": [
            "怎么预约？",
            "能改时间吗？",
            "从哪里上车？",
            "多少钱？",
            "要提前多久约？",
            "取消收费吗？"
        ],
        "medium_templates": [
            "想预约明天下午的行程，请问从{route_start}到{route_end}可以吗？",
            "请问从机场到市区怎么预约？价格大概多少？",
            "之前约的时间来不了，能改到晚上吗？",
            "起点在小区东门，终点在商场地下停车场，能到吗？"
        ],
        "long_templates": [
            "咨询一下明天上午10点从{route_start}到{route_end}的预约流程是怎样的？需要提前多久预约比较合适？价格大概在什么范围？能否使用会员优惠券？",
            "我经常需要从机场往返市区，请问你们有什么套餐或者会员优惠吗？每次单独预约感觉费用有点高，希望能有一些折扣。"
        ],
        "very_long_templates": [
            "我计划下周从{route_start}前往{route_end}参加重要会议，想提前预约一辆自动驾驶车辆。请问：1）需要提前多久预约才能保证有车？2）价格大概是多少？3）如果有会员优惠的话是自动生效还是需要手动选择？4）如果会议时间变动，改签或者取消需要收取费用吗？希望得到详细的解答，谢谢！"
        ],
        "details": [
            "从机场到市区",
            "价格大概多少钱",
            "能否使用会员优惠券",
            "需要提前多久预约",
            "起点在小区门口",
            "终点在商场地下停车场"
        ]
    },
    "事故与紧急响应": {
        "weight": 20,
        "rating_range": (1, 2),
        "keywords": [
            ["碰撞", "事故", "碰撞", "交通"],
            ["紧急", "紧急情况", "报警", "急救"],
            ["保险", "理赔", "报案", "保险报案"],
            ["安全确认", "人员安全", "确认", "安全"]
        ],
        "short_templates": [
            "出事了！怎么办？",
            "发生碰撞了！",
            "有人受伤！",
            "需要报警吗？",
            "保险怎么报？"
        ],
        "medium_templates": [
            "发生交通事故了！刚才在{route_start}附近，突然{detail}，车辆虽然刹车了但还是发生了碰撞。",
            "紧急情况！刚才行驶中{detail}，发生了碰撞。现场应该如何处理？",
            "事故后请问保险怎么理赔？需要准备什么材料？"
        ],
        "long_templates": [
            "刚才在{route_start}附近发生了交通事故，情况是这样的：{detail}，{detail2}。目前人没事，但车辆有损伤。请问这种情况应该如何处理？需要第一时间报警吗？保险报案对接的流程是怎样的？",
            "紧急求助！行驶过程中发生了{detail}的事故，{detail2}。现场有人员轻微擦伤，请问应该如何处理？是否需要呼叫急救？保险理赔流程是什么？"
        ],
        "very_long_templates": [
            "我在今天下午从{route_start}前往{route_end}的途中发生了严重的交通事故。事情经过是这样的：在正常行驶过程中，突然{detail}，尽管驾驶员已经采取了紧急制动措施，但仍然{detail2}。事故造成了车辆前部受损，所幸没有人员重伤。现在请问：1）这种紧急情况的一级响应流程是什么？2）现场指导和安全确认应该如何进行？3）保险报案对接需要联系哪个部门？4）如果需要配合交警/急救联动流程，我应该如何配合？希望能够得到详细的指导，谢谢。"
        ],
        "details": [
            "有一辆电动车冲出来",
            "前方车辆突然变道",
            "红灯时后车追尾",
            "行人突然横穿马路",
            "与摩托车发生刮蹭",
            "转弯时与直行车辆碰撞"
        ],
        "details2": [
            "还是发生了碰撞",
            "造成了车辆损伤",
            "乘客有轻微擦伤",
            "后视镜被撞坏了"
        ]
    },
    "支付与结算": {
        "weight": 20,
        "rating_range": (2, 4),
        "keywords": [
            ["费用异常", "账单", "价格不对", "扣费"],
            ["发票", "电子发票", "开票", "发票开具"],
            ["优惠券", "折扣", "无法使用", "核销"],
            ["账单争议", "费用", "结算", "差异"]
        ],
        "short_templates": [
            "费用不对！",
            "怎么开发票？",
            "优惠券用不了",
            "扣了我双倍钱",
            "价格太贵了"
        ],
        "medium_templates": [
            "上次行程费用有问题，订单显示45元，但预估只要30元。",
            "申请开具电子发票，请问多久能收到？能发到邮箱吗？",
            "优惠券无法使用，已经确认在有效期内，为什么不能用？",
            "同样的路线价格差很多，请问价格是怎么计算的？"
        ],
        "long_templates": [
            "对账单有疑问，上次行程从{route_start}到{route_end}实际费用与预估差太多了。订单显示45元，但之前预估价格是30元左右，相差幅度过大。请问这种情况如何核查？是否能退还多收的费用？",
            "我需要开具发票报销，但发现电子发票一直收不到。已经申请了好几次，{detail}。请问电子发票怎么获取？多久能收到？如果电子版有问题，能否开具纸质发票？"
        ],
        "very_long_templates": [
            "我在4月10日从{route_start}到{route_end}的行程被收取了异常高的费用。订单详情显示全程费用为89元，但根据我之前同等距离的行程经验，正常价格应该在40-50元之间。我分析了一下可能的原因：1）当天是工作日早高峰，加价幅度可能较大；2）系统可能存在绕路情况；3）会员折扣没有自动生效。我已经查看了行程轨迹，确实发现有一段路有绕行的嫌疑。希望能够核查这笔订单，如果是系统问题导致的多收费用，要求退还差价；如果是算法问题，希望能够解释清楚计价规则。",
            "我公司的差旅报销需要正式发票，但申请电子发票时遇到了很多问题。{detail}。我需要开具的发票信息如下：公司名称、统一社会信用代码、开票金额等。请问：1）电子发票多久能发送到邮箱？2）能否开具增值税专用发票？3）如果需要纸质发票应该如何申请？4）发票内容可以显示具体行程明细吗？希望能够得到详细解答，否则无法进行报销。"
        ],
        "details": [
            "订单显示45元，预估只要30元",
            "高峰期加价幅度过大",
            "绕路了导致费用增加",
            "会员折扣没有自动生效",
            "忘记选择优惠券，能补差价吗",
            "发票抬头信息有误，需要重新开具"
        ]
    },
    "车辆状态跟踪": {
        "weight": 20,
        "rating_range": (2, 4),
        "keywords": [
            ["车辆位置", "实时位置", "在哪", "位置查询"],
            ["到达时间", "多久到", "预估", "时间"],
            ["车辆异常", "抛锚", "无法到达", "取消"],
            ["司机取消", "车辆取消", "订单取消", "无车"]
        ],
        "short_templates": [
            "车在哪？",
            "还有多久到？",
            "车怎么不动了？",
            "司机取消订单了",
            "等太久了！"
        ],
        "medium_templates": [
            "预约的车辆已经过了{detail}分钟还没到，地图上显示位置一动不动。",
            "为什么车不动了？显示在路口，但已经10分钟没移动了。",
            "司机单方面取消订单，没有任何通知，耽误了重要事情。"
        ],
        "long_templates": [
            "查询车辆实时位置的问题。我在App上看到预约的车辆位置很奇怪，显示在{route_start}附近，但已经{detail}分钟没有任何移动。之前约好的是15分钟后到达，现在已经等了{detail2}分钟还是一动不动。请问这是什么情况？是车辆抛锚了还是系统定位出了问题？",
            "我要投诉车辆无法到达的问题。预约的行程被单方面取消，{detail}，没有任何提前通知。因为这次行程是去参加重要会议，现在错过了时间造成很大损失。要求平台给出解释并承担相应责任。"
        ],
        "very_long_templates": [
            "我对平台的车辆跟踪服务非常不满意。今天上午10点我预约了一辆从{route_start}到{route_end}的自动驾驶车辆，显示预计到达时间为10分钟后。但实际上：1）车辆在{detail}的位置停留了超过15分钟没有任何移动；2）App上显示的位置与实际位置严重不符；3）我多次联系客服但一直无人响应；4）最终司机单方面取消了订单，导致我延误了重要会议。作为经常需要用车的商务用户，这种情况严重影响了我的出行体验和工作安排。希望平台能够：1）解释定位系统为什么会出现如此大的偏差；2）为什么客服无法及时响应；3）如何避免类似情况再次发生；4）是否能够提供一定的补偿。",
            "关于车辆异常（抛锚）处理流程的咨询。我在昨晚使用服务时遇到了车辆抛锚的情况，当时行驶在{route_start}附近，车辆突然提示故障并缓慢停下。虽然最后安全解决了，但整个过程让人非常紧张。我想了解：1）如果再次遇到类似情况，一级响应流程是什么？2）是否有远程运维人员能够协助处理？3）因此造成的行程延误和额外交通费用能否报销？4）如何避免抛锚情况的发生？希望能够得到详细说明。"
        ],
        "details": [
            "15", "20", "30",
            "路口等红灯",
            "前方施工绕行中",
            "停车场出口排队",
            "后台显示的位置与实际不符"
        ],
        "details2": [
            "20", "25", "30"
        ]
    },
    "失物招领": {
        "weight": 15,
        "rating_range": (3, 5),
        "keywords": [
            ["遗失物品", "落在车上", "丢失", "落下"],
            ["行李箱", "背包", "物品", "找寻"],
            ["联系司机", "协助查找", "运维", "对接"]
        ],
        "short_templates": [
            "手机落车上了",
            "有看到我的行李箱吗？",
            "钥匙丢了",
            "请帮我找一下"
        ],
        "medium_templates": [
            "下车后发现{detail}落在车上了，请问如何联系司机？",
            "刚坐完车发现把{detail}弄丢了，里面有重要文件，能帮忙找吗？",
            "已经登记失物招领，请问有进展了吗？"
        ],
        "long_templates": [
            "下车后发现重要的{detail}落在车上了，里面有{detail2}。当时是从{route_start}到{route_end}，行程编号是T20260417***。请问如何联系当班司机协助查找？如果司机说没有看到，还能通过什么渠道寻找？",
            "我在今天下午乘坐自动驾驶车辆时将{detail}遗失在车上。{detail2}。我已经在失物招领系统登记了，但想知道当前的处理进度。请问运维团队有没有对车辆进行检查？如果找到了如何通知我？"
        ],
        "very_long_templates": [
            "我需要协助寻找遗失物品。今天下午3点左右，我乘坐了从{route_start}到{route_end}的自动驾驶车辆，车牌号大概是Robotaxi-深圳-***。下车时不慎将{detail}遗落在车上，里面有{detail2}等重要物品。1）请问如何联系当班司机？2）运维团队是否会对相关车辆进行排查？3）如果物品被其他乘客捡到怎么办？4）是否有失物招领的奖励机制？5）预计需要多长时间能够给出结果？希望能够得到积极处理，因为{detail3}对我非常重要。",
            "紧急求助！我的{detail}在刚才的行程中丢失了。具体行程信息：从{route_start}上车，在{route_end}下车，时间大约是下午{detail2}点左右。行李箱是黑色硬壳的，里面有我的工作电脑和很多重要文件。我已经报警并登记了失物招领，但希望平台也能够积极协助。作为乘客，我们信任平台的安全保障，希望能够理解失物主人的焦急心情。请平台务必认真对待此事。"
        ],
        "details": [
            "笔记本电脑",
            "手机",
            "行李箱",
            "背包",
            "钱包",
            "重要文件",
            "钥匙",
            "耳机",
            "身份证件"
        ],
        "details2": [
            "里面有重要文件",
            "电脑里有很多工作资料",
            "全部家当都在里面",
            "关系到我的工作"
        ]
    },
    "会员与账号管理": {
        "weight": 25,
        "rating_range": (3, 5),
        "keywords": [
            ["无法登录", "登录问题", "验证码", "账号"],
            ["会员等级", "权益", "升级", "等级咨询"],
            ["隐私", "数据删除", "合规", "个人信息"],
            ["账户问题", "注册", "注销", "封号"]
        ],
        "short_templates": [
            "登不上去",
            "收不到验证码",
            "怎么升级会员？",
            "要注销账号"
        ],
        "medium_templates": [
            "无法登录账号，{detail}，验证码一直收不到。",
            "咨询会员权益，请问金卡有什么专属权益？如何升级？",
            "根据个人信息保护法，要求删除我的所有个人数据。",
            "密码忘了，{detail}，账户里还有余额。"
        ],
        "long_templates": [
            "我无法登录账号已经持续三天了。问题是：{detail}，验证码一直收不到，{detail2}。我已经尝试了所有方法：换了手机、重置网络、甚至换了设备，但问题依然存在。账户里还有约200元的余额，而且有重要的行程记录需要查看。希望能够尽快解决，或者提供临时登录方式。",
            "咨询会员权益升级的相关问题。我目前是银卡会员，每月赠送的优惠券很实用，但{detail}。请问金卡会员有什么专属权益？升级条件是什么？之前的积分能够继承吗？有没有升级的优惠活动？"
        ],
        "very_long_templates": [
            "我需要处理账号相关的多个问题。首先，{detail}，导致我无法登录账号，验证码一直收不到。其次，我尝试通过忘记密码功能重置，但{detail2}。第三，我账户里还有约500元的余额和大量行程记录，这些数据对我很重要。第四，我有会员等级升级的需求，{detail3}。第五，长期来看我可能需要注销账号，想知道注销流程和余额处理方式。请问这些问题能够一次性解决吗？我不想来回折腾多次。希望能够得到专业、耐心的解答，谢谢。",
            "根据《中华人民共和国个人信息保护法》的要求，我正式提出数据删除请求。本人账号信息如下：注册手机号、绑定的邮箱、实名认证的身份信息等。我希望平台能够：1）删除所有个人身份信息；2）清除行程历史记录；3）注销账号；4）确认删除完成并提供书面证明。{detail}。请平台在规定时间内完成处理，并严格遵守相关法律法规。如果平台对用户数据的保存期限有要求，请明确告知。在数据完全删除之前，请确保账户安全，防止任何未授权访问。",
            "我要投诉账号安全问题。今天发现账号出现了异常登录情况，{detail}。我的账号绑定了大量个人信息，{detail2}。请问：1）平台的安全保障措施是什么？2）如果账号被盗用造成损失谁来负责？3）如何加强账号防护？4）能否提供更安全的登录验证方式？我对平台的信任度因此大幅下降，希望能够引起重视。"
        ],
        "details": [
            "短信通道异常",
            "网络连接失败",
            "密码忘记无法找回",
            "每月赠送优惠券",
            "专属客服通道",
            "优先派车权益"
        ],
        "details2": [
            "找回链接打不开",
            "安全验证一直失败",
            "账户被锁定24小时"
        ],
        "details3": [
            "年消费达到多少能升级",
            "有没有老用户专属优惠"
        ]
    }
}

def generate_text(category, city, route_start, route_end):
    template_data = templates[category]

    # 按权重选择长度：短25% 中等35% 中长25% 长15%
    length_roll = random.random()
    if length_roll < 0.25 and template_data.get("short_templates"):
        template = random.choice(template_data["short_templates"])
        text = template
    elif length_roll < 0.60 and template_data.get("medium_templates"):
        template = random.choice(template_data["medium_templates"])
        text = template.format(
            route_start=route_start,
            route_end=route_end,
            detail=random.choice(template_data["details"])
        )
    elif length_roll < 0.85 and template_data.get("long_templates"):
        template = random.choice(template_data["long_templates"])
        text = template.format(
            route_start=route_start,
            route_end=route_end,
            detail=random.choice(template_data["details"]),
            detail2=random.choice(template_data.get("details2", template_data["details"]))
        )
    elif template_data.get("very_long_templates"):
        template = random.choice(template_data["very_long_templates"])
        text = template.format(
            route_start=route_start,
            route_end=route_end,
            detail=random.choice(template_data["details"]),
            detail2=random.choice(template_data.get("details2", template_data["details"])),
            detail3=random.choice(template_data.get("details2", template_data["details"]))
        )
    else:
        # Fallback
        template = random.choice(template_data.get("medium_templates", template_data["long_templates"]))
        text = template.format(
            route_start=route_start,
            route_end=route_end,
            detail=random.choice(template_data["details"])
        )

    return text

def generate_keywords(category):
    cats = templates[category]["keywords"]
    return random.sample(random.choice(cats), min(3, len(random.choice(cats))))

def generate_item(idx, date):
    city = random.choice(cities)
    routes = routes_by_city[city]
    route = random.choice(routes)
    route_start, route_end = route[0], route[1]

    # 确定分类
    categories = list(templates.keys())
    weights = [templates[cat]["weight"] for cat in categories]
    category = random.choices(categories, weights=weights)[0]

    # 评分
    rating_min, rating_max = templates[category]["rating_range"]
    rating = random.randint(rating_min, rating_max)

    # 状态
    status = random.choices(statuses, weights=status_weights)[0]

    # 图片和视频
    has_pictures = random.random() < 0.3
    has_videos = random.random() < 0.1
    pictures = [f"https://picsum.photos/seed/{idx}_{i}/400/300" for i in range(random.randint(1, 3))] if has_pictures else []
    videos = [f"https://sample-videos.com/video{idx}.mp4"] if has_videos else []

    # ID
    fb_id = f"FB20260{date.strftime('%m%d')}{idx:03d}"

    # 时间
    hour = random.randint(6, 22)
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    trip_time = date.replace(hour=hour, minute=minute, second=second).strftime("%Y-%m-%d %H:%M:%S")

    return {
        "id": fb_id,
        "feedback_no": fb_id,
        "trip_id": f"T20260{date.strftime('%m%d')}{idx:03d}",
        "passenger_id": f"P20260{date.strftime('%m%d')}{idx:03d}",
        "vehicle_id": f"Robotaxi-{city}-{random.randint(100, 999)}",
        "rating": rating,
        "feedback_text": generate_text(category, city, route_start, route_end),
        "feedback_pictures": pictures,
        "feedback_videos": videos,
        "city": city,
        "route_start": route_start,
        "route_end": route_end,
        "trip_time": trip_time,
        "trip_duration": random.randint(15, 90) if status != "已关闭" else 0,
        "status": status,
        "ai_category": [category],
        "ai_keywords": generate_keywords(category),
        "feedback_channel": random.choice(channels),
        "reply_text": "感谢您的反馈，我们会尽快处理。" if status in ["处理中", "已处理"] else "",
        "reply_time": date.replace(hour=random.randint(9, 18)).strftime("%Y-%m-%d %H:%M:%S") if status in ["处理中", "已处理"] else ""
    }

# 生成150条数据
data = []
base_date = datetime(2026, 4, 17)
for i in range(1, 151):
    # 分散日期
    days_ago = i // 15
    date = base_date - timedelta(days=days_ago)
    data.append(generate_item(i, date))

# 输出
output = {"data": data}
with open(r"f:\AI_Agent\滴滴Robotaxi 乘客反馈管理平台\乘客反馈管理平台\data\mock\mock_feedback_data_150.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"Generated {len(data)} records")
print(f"Categories distribution:")
for cat in templates.keys():
    count = sum(1 for item in data if cat in item["ai_category"])
    print(f"  {cat}: {count}")