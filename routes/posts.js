const express = require("express");
const router = express.Router();
const path = require('path');
const User = require("../models/users");
const Post = require("../models/posts");
const Comment = require("../models/comments")
const RepComment = require("../models/reportComments");
const RepPost = require("../models/reportPosts");
const Vote = require("../models/votes");

// Session Checking - Check if authenticated
const isAuth = (req, res, next) =>{
    if(req.session.isAuth){
        next();
    }else{
        res.redirect("/login");
    }
};

// ============== Post Uploading ==============

router.get("/postCreate", isAuth, function(req, res){
    res.render("postCreate", {title: "Post Your Meme"});
});

router.post("/postUpload", isAuth, async function(req, res){
    var img = req.files.postImg;
    var imgName = req.session.username + "-" + img.name;

    var capInput = req.body.postCaption.toString();

    // Redirect to upload folder
    await img.mv(path.resolve(__dirname + '/..', 'public/images/posts', imgName));

    const post = new Post({
        username: req.session.username,
        dateCreated: new Date(),
        caption: capInput,
        img: imgName,
        upvotes: 0,
        downvotes: 0,
        commentCount: 0
    })

    post.save()
        .then((result) => {
            res.redirect("/");
        })
        .catch((err) =>{
            res.send(err);
        });
});

// ============== Post Viewing ==============

router.get("/post/:id", async function(req, res){
    const postID = req.params.id;
    const post = await Post.findById(postID);
    const comments = await Comment.find({postID: postID});

    if(!post){
        res.redirect("/home");
    }

    const postUser = await User.findOne({username: post.username});

    if(!postUser){
        res.redirect("/home");
    }

    if(!comments){
        console.log("No Comments.");
    }

    if(req.session.isLoggedIn){
        const searchVote = await Vote.findOne({username: req.session.username, postID: postID});

        if(!searchVote){
            const addVote = new Vote({
                postID: postID,
                username: req.session.username,
                vote: 0
            });

            addVote.save();
        }

        const upvCount = await Vote.count({postID: postID, vote: 1});
        const dvCount = await Vote.count({postID: postID, vote: -1});
        const commCount = await Comment.count({postID: postID});
        
        await Post.updateOne(
            {username: post.username, caption: post.caption}, 
            {$set: {
                upvotes: upvCount,
                downvotes: dvCount,
                commentCount: commCount
            }})
        
        const voteOfUser = await Vote.findOne({username: req.session.username, postID: postID});

        res.render("postView", {
            title: "Your Main Source of Fun",
            user: postUser,
            post: post,
            comments: comments,
            vote: voteOfUser
        })
    }

    return res.render("postView", {
        title: "Your Main Source of Fun",
        user: postUser,
        post: post,
        comments: comments,
    })
});


// ============== Post Reporting ==============

router.post("/postReport/:id", isAuth, async function(req, res){
    const postID = req.params.id;

    await Post.findById(postID)
        .then((results) => {
            res.render("reportPost", {
                title: "Report Post",
                post: results
            });
        })
        .catch((err) =>{
            console.log(err);
        });
});

router.post("/confirmPostReport/:id", isAuth, async function(req, res){
    var repType = req.body.reportType;

    console.log(repType);

    const report = new RepPost({
        postID: req.params.id,
        reporterUser: req.session.username, 
        remarks: repType,
        dateReported: new Date()
    });

    await report.save()
        .then((result) => {
            res.redirect("/post/" + req.params.id);
        })
        .catch((err) =>{
            res.send(err);
        });

});

// ============== Post Voting ==============

router.post("/vote/:id", async function(req, res){
    var postID = req.params.id;
    var voter = req.session.username;
    var action = req.body.voteBtn;

    await Vote.updateOne({username: voter, postID: postID}, {$set: {vote: action}});

    const upvCount = await Vote.count({postID: postID, vote: 1});
    const dvCount = await Vote.count({postID: postID, vote: -1});
    const postHolder = await Post.findById(postID);
    
    await Post.updateOne(
        {username: postHolder.username, caption: postHolder.caption}, 
        {$set: {
            upvotes: upvCount,
            downvotes: dvCount
        }});

    res.redirect("/post/" + postID);
})

// ============== Post Searching ==============

router.get("/search", async function(req, res){
    const searchInput = req.query.searchInput;

    await Post.find({caption: {$regex: new RegExp(searchInput, 'i')}}).then((results)=>{
        res.render("search", {
            title: "Search Results",
            posts: results
        });
    }).catch((err) => {
        console.log(err);
    })
})

module.exports = router;