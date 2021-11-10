import NetInfo from '@react-native-community/netinfo';
import Storage from 'react-native-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { GiftedChat, Bubble, InputToolbar } from 'react-native-gifted-chat';
import {
    View,
    Platform,
    KeyboardAvoidingView,
    Text,
} from 'react-native';

// This import loads the firebase namespace.
import firebase from "firebase";
import "firebase/firestore";


export default class Chat extends React.Component {
    constructor() {
        super();
        this.state = {
            messages: [],
            uid: 0,
            loggedInText: "Logging in...",
            user: {
                _id: "",
                name: "",
            },
        };
        const firebaseConfig = {
            apiKey: "AIzaSyDHernoUFx9iw02yxukpSuBQQeULr3Xqjs",
            authDomain: "chat-app-71127.firebaseapp.com",
            projectId: "chat-app-71127",
            storageBucket: "chat-app-71127.appspot.com",
            messagingSenderId: "298365903023",
            appId: "1:298365903023:web:7a616462527a8310edb45a"
        };

        //init db connection
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            this.referenceChatMessages = firebase.firestore().collection("messages");
            this.referenceChatMessageUser = null;
        }
    }

    //function for getting messages
    async getMessages() {
        let messages = '';
        try {
            messages = (await AsyncStorage.getItem('messages')) || [];
            this.setState({
                messages: JSON.parse(messages)
            });
        } catch (error) {
            console.log(error.message);
        }
    };

    componentDidMount() {
        //tells whether to fetch data from asyncStorage or Firestore
        NetInfo.fetch().then(connection => {
            if (connection.isConnected) {
                console.log('online');
            } else {
                console.log('offline');
            }
        });

        this.getMessages();
        //put  username in navigation bar (passes prop from start)
        const name = this.props.route.params.name;

        //change background color based on user's choice (prop passed from start)
        const background = this.props.route.params.background;
        this.props.navigation.setOptions({
            title: `Welcome ${name}`,
            headerStyle: {
                backgroundColor: `${background}`,
            },
            headerTintColor: "#212224",
        });

        // calls the authentication service
        this.authUnsubscribe = firebase.auth().onAuthStateChanged((user) => {
            if (!user) {
                firebase.auth().signInAnonymously();
            }
            this.referenceChatMessages = firebase.firestore().collection("messages");
            //contains system message welcoming user to chat
            this.setState({
                uid: user.uid,
                messages: [],
                loggedInText: '  Welcome to the chat!',
                user: {
                    _id: user.uid,
                    name: name,
                },
            });
            this.referenceChatMessageUser = firebase
                .firestore()
                .collection("messages")
                .where("uid", "==", this.state.uid);
            this.unsubscribe = this.referenceChatMessages
                .orderBy("createdAt", "desc")
                .onSnapshot(this.onCollectionUpdate);
        });
    }

    renderInputToolbar(props) {
        if (this.state.isConnected == false) {
        } else {
            return <InputToolbar {...props} />;
        }
    }

    componentWillUnmount() {
        this.authUnsubscribe();
        this.unsubscribe();
    }

    //retrieves current data in collection an makes it visible
    onCollectionUpdate = (querySnapshot) => {
        const messages = [];
        // go through each document
        querySnapshot.forEach((doc) => {
            // get the QueryDocumentSnapshot's data
            let data = doc.data();
            messages.push({
                _id: data._id,
                text: data.text,
                createdAt: data.createdAt.toDate(),
                user: {
                    _id: data.user._id,
                    name: data.user.name,
                },
            });
            this.setState({
                messages,
            });
        });
    };

    async saveMessages() {
        try {
            await AsyncStorage.setItem('messages', JSON.stringify(this.state.messages));
        } catch (error) {
            console.log(error.message);
        }
    }

    addMessage() {
        const message = this.state.messages[0];
        // adds an object to the messages collection
        this.referenceChatMessages.add({
            _id: message._id,
            uid: this.state.uid,
            createdAt: message.createdAt,
            text: message.text || "",
            user: message.user,
        });
    }

    async deleteMessages() {
        try {
            await AsyncStorage.removeItem('messages');
            this.setState({
                messages: []
            })
        } catch (error) {
            console.log(error.message);
        }
    }


    //allows messages to be sent/submitted
    onSend(messages = []) {
        this.setState(
            (previousState) => ({
                messages: GiftedChat.append(previousState.messages, messages),
            }),
            () => {
                this.saveMessages();
            }
        );
    }
    //creates a bubble for the messagesa
    renderBubble(props) {
        return (
            <Bubble
                {...props}
                wrapperStyle={{
                    right: {
                        background: "linear-gradient(to right, #662121, #CF2C2C)",
                    },
                }}
            />
        );
    }

    render() {
        return (
            <View style={{ flex: 1 }}>
                <Text>{this.state.loggedInText}</Text>
                {/* bubble around messages*/}
                <GiftedChat
                    renderBubble={this.renderBubble.bind(this)}
                    messages={this.state.messages}
                    onSend={(messages) => this.onSend(messages)}
                    user={this.state.user}
                />
                {/*Fixees android keyboard issue*/}
                {Platform.OS === "android" ? (
                    <KeyboardAvoidingView behavior="height" />
                ) : null}
            </View>
        );
    }
}