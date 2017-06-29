/**
 * Created by lwc on 2017/5/4.
 */
import React, { Component } from 'react';
import { Row, Col, Input, Tabs, Modal, notification } from 'antd';
import io from 'socket.io-client';


import Chat from '../components/chat';
import ChatSend from './chatSend';
import ChatMessage from './chatMessage';
import ChatEmpty from './chatEmpty';
import ChatUser from './chatUser';
import ChatIcon from './chatMenuIcon';
import ChatList from './chatLists';
import ChatSetting from './chatSetting';

const TabPane = Tabs.TabPane;
var notifyKey = '';


import '../static/css/customerSuccess.css';

/**
 * Customer Component
 *
 */

class CustomerSuccess extends Component{
    constructor(props){
        super(props);
        this.state = {
            socket: {},
            csid: localStorage['uuchat.csid'] || '',
            csName: localStorage['uuchat.name'] || '',
            csDisplayName: localStorage['uuchat.displayName'] || '',
            csEmail: localStorage['uuchat.email'] || '',
            csAvatar: localStorage['uuchat.avatar'] || '',
            customerSelect:{
                cid: '',
                name: '',
                marked: 0
            },
            messageLists: {},
            customerLists: [],
            menuIcons:{
                chat: 'chat_selected',
                contact: 'contact',
                setting: 'setting'
            },
            chatNotify: {},
            isClose: false,
            isOnline: true,
            isConnectErr: false
        };

        this.customerSuccessConnect    = this.customerSuccessConnect.bind(this);
        this.customerSuccessConectErr  = this.customerSuccessConectErr.bind(this);
        this.customerSuccessDisconnect = this.customerSuccessDisconnect.bind(this);
        this.socketReconnect           = this.socketReconnect.bind(this);
        this.csCustomerList            = this.csCustomerList.bind(this);
        this.csCustomerOne             = this.csCustomerOne.bind(this);
        this.csDispatch                = this.csDispatch.bind(this);
        this.csNeedLogin               = this.csNeedLogin.bind(this);
        this.cMessage                  = this.cMessage.bind(this);
        this.cDisconnect               = this.cDisconnect.bind(this);
        this.csCustomerOffline         = this.csCustomerOffline.bind(this);
        this.socketError               = this.socketError.bind(this);

        this.onSearchHandler          = this.onSearchHandler.bind(this);
        this.onChatListClick          = this.onChatListClick.bind(this);
        this.customerSuccessMessage   = this.customerSuccessMessage.bind(this);
        this.statusHandle             = this.statusHandle.bind(this);

        this.menuIconClick = this.menuIconClick.bind(this);
        this.loginOut = this.loginOut.bind(this);
        this.closeDialog = this.closeDialog.bind(this);
        this.socketTransfer = this.socketTransfer.bind(this);
        this.statusToggle = this.statusToggle.bind(this);
        this.avatarHandle = this.avatarHandle.bind(this);
        this.createSocket = this.createSocket.bind(this);

    }
    componentDidMount(){
        var that = this;
        this.createSocket();
        window.onbeforeunload = function(){
            if(that.isClose){
                return true;
            }
            return 'Are you sure to leave??';
        };
    }

    /***
     * createSocket
     */
    createSocket(){
        var sio = io('/cs', {
            forceNew: true,
            reconnectionAttempts:5,
            reconnectionDelay:2000 ,
            timeout: 10000
        });

        sio.on('connect', this.customerSuccessConnect);
        sio.on('connect_error', this.customerSuccessConectErr);
        sio.on('disconnect', this.customerSuccessDisconnect);
        sio.on('reconnect', this.socketReconnect);
        sio.on('cs.customer.one', this.csCustomerOne);
        sio.on('cs.customer.list', this.csCustomerList);
        sio.on('cs.dispatch', this.csDispatch);
        sio.on('cs.need.login', this.csNeedLogin);
        sio.on('c.message', this.cMessage);
        sio.on('c.disconnect', this.cDisconnect);
        sio.on('cs.customer.offline', this.csCustomerOffline);
        sio.on('error', this.socketError);
        this.setState({
            socket: sio
        });
    }

    /***
     * cs.customer.list
     */
    csCustomerList(data){
        var customer = {};
        data.map((d)=>customer[d.cid] = []);

        this.setState({
            customerLists: data,
            messageLists: customer,
            customerSelect: {
                cid: data[0].cid,
                name: data[0].name,
                marked: data[0].marked
            }
        });

        for(var i = 0; i < data.length; i++){
            this.getMessageHistory(data[i].cid);
        }
    }

    /***
     * cs.customer.one
     */
    csCustomerOne(data){
        var customerLists = this.state.customerLists,
            messageLists = this.state.messageLists,
            cid = this.state.customerSelect.cid,
            name = this.state.customerSelect.name,
            marked = this.state.customerSelect.marked;

        customerLists.unshift(data);

        if(!messageLists[data.cid]){
            if(customerLists.length <=1 ){
                cid = data.cid;
                name = data.name;
                marked = data.marked;
            }
        }else{
            cid = data.cid;
            name = data.name;
            marked = data.marked;
        }
        this.getMessageHistory(data.cid);
        this.setState({
            customerLists: customerLists,
            customerSelect: {
                cid: cid,
                name: name,
                marked: marked
            }
        });
    }

    /***
     * cs.dispatch
     */
    csDispatch(cid, name, info){
        var customerLists = this.state.customerLists;
        customerLists.unshift({
            cid: cid,
            name: name,
            info: info
        });

        if(customerLists.length > 1){
            this.setState({
                customerLists: customerLists
            });
        }else{
            this.getMessageHistory(cid);
            this.setState({
                customerLists: customerLists,
                customerSelect: {
                    cid: cid,
                    name: name
                }
            });
        }
    }

    /***
     * cs.need.login
     */
    csNeedLogin(fn){
        fn(true);
        this.state.socket.disconnect();
        window.location.href="/";
    }

    /***
     * c.message
     */
    cMessage(cid, msg){
        var message = {
            msgAvatar: '',
            msgText: msg,
            msgType: 0,
            msgTime: new Date()
        };

        var msgArr = this.state.messageLists[cid],
            messageLists = this.state.messageLists,
            chatNotify = this.state.chatNotify;

        if(this.state.customerSelect.cid !== cid){
            if(!chatNotify[cid]){
                chatNotify[cid] = 1;
            }else{
                chatNotify[cid]++;
            }
        }

        msgArr && msgArr.push(message);
        messageLists[cid] = msgArr;


        this.setState({
            messageLists:  messageLists,
            chatNotify: chatNotify
        });
    }

    /***
     * c.disconnect
     */
    cDisconnect(cid){
        var customerLists = this.state.customerLists,
            cSelectCid = this.state.customerSelect.cid,
            cSelectName = this.state.customerSelect.name;

        customerLists.map((c, i)=> c.cid === cid && customerLists.splice(i, 1));

        if(customerLists.length > 0){
            cSelectCid = customerLists[0].cid;
            cSelectName = customerLists[0].name;
        }else{
            cSelectCid = '';
            cSelectName = '';
        }

        this.setState({
            customerSelect:{
                cid: cSelectCid,
                name: cSelectName
            },
            customerLists: customerLists
        });
    }

    /***
     * cs.customer.offline
     */
    csCustomerOffline(data){
        var customerLists = this.state.customerLists;
        customerLists.unshift({
            cid: data.cid,
            name: data.name,
            type: 'offline',
            msg: {
                name: data.name,
                email: data.email,
                content: data.content
            }
        });
        this.setState({
            customerLists: customerLists
        });
    }

    /***
     * reconnect
     */
    socketReconnect(){}

    /***
     * error
     */
    socketError(){}

    /***
     *
     * customerSuccessConnect Socket Connected Server Handle
     *
     */
    customerSuccessConnect(){
        var isConnectErr = this.state.isConnectErr;

        if(isConnectErr){
            notification.close("errNotifyKey");
            notifyKey = "";
            this.setState({
                isConnectErr: false
            });
        }

    }

    /***
     *
     * customerSuccessConectErr socket connect server Error handle
     *
     */

    customerSuccessConectErr(){
        if(notifyKey === ""){
            notification.open({
                message: 'Server error',
                top: 50,
                duration: null,
                key: 'errNotifyKey',
                description: 'The server has offline!!!!.'
            });
            notifyKey = "nKey";
        }

       this.setState({
            isConnectErr: true,
            customerSelect:{
                cid: '',
                name: '',
                marked: 0
            },
            messageLists: {},
            customerLists: []
        });
    }

    /***
     *
     *  Server disconenct or network disconnection handle
     *
     *
     */
    customerSuccessDisconnect(){

    }

    onSearchHandler(val){

    }

    /***
     *
     * @param activeIndex
     * @param name
     */
    onChatListClick(name, cid, marked){

        var chatNotify = this.state.chatNotify;
        if(cid === this.state.customerSelect.cid){
            return false;
        }

        if(chatNotify[cid]){
            chatNotify[cid] = 0;
        }

        this.setState({
            customerSelect: {
                cid: cid,
                name: name,
                marked: marked
            },
            chatNotify: chatNotify
        });

        this.getMessageHistory(cid);
    }

    /***
     *
     * customerSuccess send message to customer
     *
     * @param msg
     */
    customerSuccessMessage(msg){
        var that = this,
             cid = that.state.customerSelect.cid;
        if(msg !== ''){

            /***
             *
             *  Send Message To Server
             *
             *
             */
            this.state.socket.emit('cs.message', cid, msg, function(success){
                var avatar = that.state.csAvatar ? '/' +that.state.csAvatar : require('../static/images/contact.png'),
                    message,
                    messageLists = that.state.messageLists,
                    msgArr = messageLists[cid];

                message = {
                    msgAvatar: avatar,
                    msgText: msg,
                    msgType: 1,
                    msgTime: new Date()
                };

                msgArr.push(message);
                messageLists[cid] = msgArr;

                that.setState({
                    messageLists:  messageLists
                });

            });

        }

    }
    /***
     *
     * @returns {boolean}
     */

    menuIconClick(index){
        this.setState({
            menuIcons:{
                chat: (index === "1" ? 'chat_selected' : 'chat'),
                contact: (index === "2" ? 'contact_selected' : 'contact'),
                setting: (index === "3" ? 'setting_selected' : 'setting')
            }
        });
    }

    /***
     *
     * Close the customer dialog
     *
     */
    closeDialog(e, cid){
        e.stopPropagation();

        var that = this;
        Modal.confirm({
            title: 'Do you Want to close this customer?',
            content: 'If yes , the customer window will be remove',
            okText: 'Yes',
            cancelText: 'No',
            onOk() {
                var customerLists = that.state.customerLists,
                    messageLists = that.state.messageLists,
                    scid = that.state.customerSelect.cid,
                    name = that.state.customerSelect.name;

                delete messageLists[cid];

                customerLists && customerLists.map((c, i) => c.cid === cid &&  customerLists.splice(i, 1));

                if(customerLists.length > 0){
                    if(scid === cid){
                        scid = customerLists[0].cid;
                        name = customerLists[0].name;
                    }
                }else{
                    scid = '';
                    name = '';
                }

                that.state.socket.emit('cs.closeDialog', cid, function(flag){
                    if(flag){
                        that.setState({
                            customerLists: customerLists,
                            messageLists: messageLists,
                            customerSelect:{
                                cid: scid,
                                name: name
                            }
                        });
                    }
                });
            },
            onCancel() {

            }
        });
    }

    /***
     * socketTransfer
     */
    socketTransfer(cid){

        var customerLists = this.state.customerLists,
            messageLists = this.state.messageLists,
            scid = this.state.customerSelect.cid,
            name = this.state.customerSelect.name;

        delete messageLists[cid];

        customerLists && customerLists.map((c, i) => c.cid === cid &&  customerLists.splice(i, 1));

        if(customerLists.length > 0){
            if(scid === cid){
                scid = customerLists[0].cid;
                name = customerLists[0].name;
            }
        }else{
            scid = '';
            name = '';
        }
        this.setState({
            customerLists: customerLists,
            messageLists: messageLists,
            customerSelect:{
                cid: scid,
                name: name
            }
        });
    }
    /***
     *
     * User login out
     *
     */
    loginOut(e){
        e.preventDefault();
        var that = this;
        fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        .then((res)=>res.json())
        .then(function(d){
            if(200 === d.code){
                that.state.socket.emit('cs.logout',function(type){});
                that.state.socket.close();
                window.location.href = '/';
            }
        })
        .catch(function(e){

        });
    }

    /***
     *
     *   status handle
     */
    statusHandle(type){
        this.state.socket.emit('cs.status', this.state.customerSelect.cid, type, function(state){})
    }

    /***
     * get customerSuccess and customer chat history
     *
     */
    getMessageHistory(cid){
        var that = this;

        if(that.state.messageLists[cid] && that.state.messageLists[cid].length > 0){
            return false;
        }

        fetch('/messages/customer/'+cid+'/cs/'+this.state.csid)
            .then((data) => data.json())
            .then(d =>{
                var historyMessage = that.state.messageLists,
                    avatar;

                if(that.state.csAvatar){
                    avatar = that.state.csAvatar;
                }else{
                    avatar = require('../static/images/contact.png');
                }

                if(!historyMessage[cid] ){
                    historyMessage[cid]=[];
                }

                d.msg.map((dd) =>{
                    return historyMessage[cid].push({
                        msgAvatar: (dd.type === 1) ? avatar : '',
                        msgText: dd.msg,
                        msgType: dd.type,
                        msgTime: new Date(dd.createdAt)
                    });
                });
                that.setState({
                    messageLists:  historyMessage
                });

            })
            .catch(function(e){});
    }

    /***
     *
     * filterCustomerInfo
     *
     */
    filterCustomerInfo(customer, cid){
        var cdata = null;
        if(customer.length > 0){
            for(var i = 0, l = customer.length; i < l; i++){
                if(customer[i].cid === cid){
                    cdata = customer[i];
                    break;
                }
            }
        }
        return cdata;
    }

    /***
     * @returns {boolean}
     *       statusToggle
     */
    statusToggle(){
        var state = this.state,
            status = state.isOnline,
            stat = 1;

        if(state.isConnectErr){
           this.createSocket();
            notification.close("errNotifyKey");
        }else{
            if(status){
                stat = 2;
                status = false;
            }else{
                stat = 1;
                status = true;
            }
            state.socket.emit('cs.changeOnOff', stat, function(isToggle){});
            this.setState({
                isOnline: status
            });
        }

    }

    /***
     * avatarHandle
     */
    avatarHandle(avatar){
        this.setState({
            csAvatar: avatar
        });
    }
    render(){

        var state = this.state,
            cArr = [],
            Info = this.filterCustomerInfo(state.customerLists, state.customerSelect.cid);

        if(state.customerLists.length > 0){
            state.customerLists.forEach((chat, index)=>{
                if(chat.cid !== ''){
                    var num = (!state.chatNotify[chat.cid]) ? 0 : state.chatNotify[chat.cid],
                        isActive = (state.customerSelect.cid === chat.cid);
                    if(chat.type && chat.type === 'offline'){
                        cArr.push(<Chat key={index} email={chat.msg} cid={chat.cid} name={chat.name} type={chat.type}  />)
                    }else{
                        cArr.push(<Chat key={index} marked={chat.marked} cid={chat.cid} newMsg={state.messageLists[chat.cid]} name={chat.name} num={ num } closeDialog={this.closeDialog} onChatListClick={this.onChatListClick} isActive={isActive} />)
                    }


                }
            });
        }

        return (
            <div className={"uuchat-customerSuccess " + ((!state.isOnline || state.isConnectErr) ? " off" : "")}>
                    <div className="customerSuccess-header">
                        <Row>
                            <Col span={6}>
                                <div className="user-status">
                                    <div className="status-bar" onClick={this.statusToggle}>
                                        {state.isConnectErr ?
                                            <p><i className="off"></i> Disconnected, Click to reconnect</p>
                                            :
                                            <p><i className={state.isOnline ? '' : 'off'}></i>{state.isOnline ? '' : 'Not '}Accepting New Chats</p>
                                        }

                                    </div>
                                </div>
                            </Col>
                            <Col span={18} className="user-avatar">
                                 <div className="user-avatar-box">
                                     <img src={ (state.csAvatar !=='null' && state.csAvatar) ? '/'+state.csAvatar
                                         : require('../static/images/contact.png')} alt="avatar" title="avatar" />&nbsp;&nbsp;
                                     <a href="" className="logout" onClick={this.loginOut}>
                                         LOGOUT &nbsp;{state.csName || state.csEmail}
                                     </a>
                                </div>
                            </Col>
                        </Row>
                    </div>
                    <Row className="customerSuccess-main">
                        <Col xs={24} sm={7} md={7} lg={6} xl={6}>
                            <div className="customerSuccess-left">
                                <div className="left-menu">
                                   <Input.Search
                                        placeholder=""
                                        onSearch={value =>{ this.onSearchHandler(value)}}
                                    />
                                </div>
                                <Tabs defaultActiveKey="1" onTabClick={this.menuIconClick}>
                                    <TabPane tab={<ChatIcon name={state.menuIcons.chat} />} key="1">
                                            <ul className="customer-lists">
                                            {cArr}
                                            </ul>
                                    </TabPane>
                                    <TabPane tab={<ChatIcon name={state.menuIcons.contact} />} key="2">
                                         <ChatList csid={state.csid} csAvatar={state.csAvatar} />
                                    </TabPane>
                                    <TabPane tab={<ChatIcon name={state.menuIcons.setting} />} key="3">
                                        <ChatSetting name={state.csName} csid={state.csid} avatarHandle={this.avatarHandle} />
                                    </TabPane>
                                </Tabs>
                            </div>
                        </Col>
                        <Col xs={24} sm={11} md={11} lg={12} xl={12}>
                            <div className="customerSuccess-content">
                            {
                                state.customerSelect.cid !== '' &&
                                <ChatMessage
                                    socket={state.socket && state.socket}
                                    cid={state.customerSelect.cid}
                                    csid={state.csid}
                                    csAvatar={state.csAvatar}
                                    messageLists={state.messageLists[state.customerSelect.cid]}
                                    chatRoleName={state.customerSelect.name}
                                    transferHandle={this.socketTransfer}
                                    marked={state.customerSelect.marked }
                                    />
                            }
                            {
                                state.customerSelect.cid !== '' &&
                                <ChatSend
                                    sendMessage={this.customerSuccessMessage}
                                    statusHandle={this.statusHandle}
                                    cid={state.customerSelect.cid}
                                    csid={state.csid}
                                    socket={this.state.socket}
                                    />
                            }
                            {
                                state.customerSelect.cid ==='' && <ChatEmpty />
                            }
                            </div>
                        </Col>
                        <Col xs={24} sm={6} md={6} lg={6} xl={6}>
                            <div className="customerSuccess-right">
                                { state.customerSelect.cid !== "" && <ChatUser info={Info} />}
                            </div>
                        </Col>
                    </Row>
            </div>
        );
    }

}


export default CustomerSuccess;