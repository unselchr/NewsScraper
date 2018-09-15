var express=require("express");
var bodyParser=require("body-parser");
var mongoose=require("mongoose");
var exphbs=require("express-handlebars");

var cheerio=require("cheerio");
var request=require("request");

var db=require("./models");
var PORT=3000;
var app=express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
app.engine(
    "handlebars",
    exphbs({
      defaultLayout: "main",
      extname: ".handlebars"
    })
  );
  app.set("view engine", "handlebars");
// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/newsScraper";

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI);
//express routes
app.get("/home",function(req,res){
    db.Article.find({},function(err,data){
        if(err){
            console.log(err);
        }
        else{
            //console.log(data.length);
            res.render("home",{data:data});
        }
    })
})
app.get("/saved",function(req,res){
    db.Article.find({saved:true})
    .populate("comments")
    .then(function(dbArticle){
        res.render("saved",{data:dbArticle});
    })
    .catch(function(err){
        console.log(err);
        res.json(err);
    })
})
app.get("/scrape",function(req,res){
    request.get("https://nypost.com/",function(err,response,body){
        if(err){
            console.log(err);
        }
        else{
            //res.send(body);
            var $=cheerio.load(body);
            $(".top-story").each(function(i,element){
                var result={};
                result.link=$(this)
                    .children("a")
                    .attr("href");
                result.title=$(this)
                    .find(".headline")
                    .text();
                result.summary=$(this)
                    .find(".display-tag")
                    .text();
                result.saved=false;
                db.Article.create(result)
                    .then(function(dbArticle){
                        console.log(dbArticle);
                    })
                    .catch(function(err){
                        //console.log(err);
                        //return res.json(err);
                    });
            })
        }
        res.redirect("/home");
    })
})
app.get("/clear",function(req,res){
    db.Article.deleteMany({saved:false},function(err){
        if(err){
            console.log(err);
        }
        else{
            res.redirect("home");
        }
    })
})
app.post("/save/:id",function(req,res){
    db.Article.update({_id:req.params.id},{$set:{saved:true}},function(err){
        if(err){
            console.log(err);
            res.json(err);
        }
        else{
            res.json("/saved");
        }
    })
})
app.post("/comment/:id",function(req,res){
    //console.log(req.body)
    db.Comment.create(req.body)
    .then(function(dbComment){
        return db.Article.findOneAndUpdate({_id:req.params.id},{$push:{comments:dbComment._id}},{new:true});
    })
    .then(function(dbArticle){
        res.send("/saved");
    })
    .catch(function(err){
        console.log(err);
        res.send(err);
    })
})
app.delete("/comment/:id",function(req,res){
    db.Comment.deleteOne({_id:req.params.id},function(err){
        if(err){
            console.log(err);
            res.json(err);
        }
        else{
            res.send("/saved");
        }
    })
})
//end routes
app.listen(PORT, function() {
    console.log("App running on port " + PORT + "!");
  });