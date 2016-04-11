$(function() {
    var numEntries = 0;
    var numFiles = 0;
    var stats = $("#stats");
    var chart = $("#myChart");
    var ctx = chart.get(0).getContext("2d");
    var myBarChart;
    var showBox = $("#showBox");
    
// HTML escapting from http://stackoverflow.com/a/13510502

    var __entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;',
        "/": '&#x2F;'
    };

    String.prototype.escapeHTML = function() {
        return String(this).replace(/[&<>"'\/]/g, function (s) {
            return __entityMap[s];
        });
    }

    function updateStatsText() {
        stats.html("Currently we have " + numEntries + " log entries in " +
                   numFiles + " log files.");
    }

    function updateStats() {
        var numUpdated = 0;
        
        $.getJSON("/count", function(v) {
            numEntries = v.count;
            numUpdated++;
            if (numUpdated >=2) {
                updateStatsText();
            }
        });
        $.getJSON("/storedFileCount", function(v) {
            numFiles = v.count;
            numUpdated++;
            if (numUpdated >=2) {
                updateStatsText();
            }
        });
    }
    
    updateStats();

    function logOrder(a, b) {
        var countOrder;
        var fileOrder;
        var dateOrder;
        
        var ma = moment([a.month, a.day, a.time].join(' '), "MMM-DD-HH:mm:ss");
        var mb = moment([b.month, b.day, b.time].join(' '), "MMM-DD-HH:mm:ss");
        
        if (ma.isSame(mb)) {
            dateOrder = 0;
        } else if (ma.isBefore(mb)) {
            dateOrder = -1;
        } else {
            dateOrder = 1;
        }
        
        if (a.count > b.count) {
            countOrder = 1;
        } else if (a.count < b.count) {
            countOrder = -1;
        } else {
            countOrder = 0;
        }
        
        if (a.file > b.file) {
            fileOrder = 1;
        } else if (a.file < b.file) {
            fileOrder = -1;
        } else {
            fileOrder = 0;
        }
        
        if (dateOrder === 0) {
            if (fileOrder === 0) {
                return countOrder;
            } else {
                return fileOrder;
            }
        } else {
            return dateOrder;
        }
    }
    
    function entriesToLines(theLogs, htmlify) {
        var i, s, entry;
        var lines = [];

        console.log("Sorting lines...");
        
        var entries = theLogs.sort(logOrder);
        
        for (i=0; i<theLogs.length; i++) {
            entry = theLogs[i];
            s = [entry.month, entry.day, entry.time, entry.host,
                 entry.service + ":", entry.message];
            if (htmlify) {
                lines.push('<p class="scrollpar">' +
                           s.join(' ').escapeHTML() + '</p>');
            } else {
                lines.push(s.join(' ') + '\n');
            }
        }

        console.log("Sorting complete!");

        return lines;
    }

    function graphSelected(theLogs) {
        var dateCount = {};
        var labels;
        var data = [];
        
        var graphData = {
            labels: [],
            datasets: [
                {
                    label: "Feb 16",
                    fillColor: "rgba(151,187,205,0.5)",
                    strokeColor: "rgba(151,187,205,0.8)",
                    highlightFill: "rgba(151,187,205,0.75)",
                    highlightStroke: "rgba(151,187,205,1)",
                    data: []
                }
            ]
        };
        
        theLogs.forEach(function(entry) {
            var theDate = entry.month + ' ' + entry.day;
            
            if (dateCount[theDate]) {
                dateCount[theDate]++;
            } else {
                dateCount[theDate] = 1;
            }
        });

        labels = Object.keys(dateCount).sort();
        
        labels.forEach(function(d) {
            data.push(dateCount[d]);
        });
        
        graphData.labels = labels;
        graphData.datasets[0].data = data;
        
        return graphData;
    }

    function saveDownloadedFile(fileContents) { 
        var lines;
        lines = entriesToLines(fileContents, false);
        saveAs(new Blob([lines],
                        {type: "text/plain;charset=utf-8"}),
               "results.txt");
    }

    function doQuery(callback) {
        var formData = {message: $("#message").val(),
                        service: $("#service").val(),
                        file: $("#file").val(),
                        month: $("#month").val(),
                        day: $("#day").val(),
                        count: $("#count").val()};
        $.post("/doQuery", formData, callback);
    }

    function showChart(entries) {
        if (myBarChart) {
            myBarChart.destroy();
        }
        myBarChart = new Chart(ctx).Bar(graphSelected(entries), {});
        chart.show();
        showBox.hide();
    }

    function showEntriesInScrollBox(entries) {
        var boxHTML;

        console.log("Creating box");
        chart.hide();
        boxHTML = entriesToLines(entries, true);
        showBox.html(boxHTML);
        showBox.show();
    }
    
    function doSubmit() {
        var action = $("#queryType").val();
        console.log("Action:" + action);
        if (action === "download") {
            doQuery(saveDownloadedFile);
        } else if (action === "visualize") {
            doQuery(showChart);
        } else if (action === "show") {
            doQuery(showEntriesInScrollBox);
        }
    }
    
    $("#submitQuery").click(doSubmit);
    chart.hide();

    var fileUploader = $("#fileuploader");
    
    fileUploader.uploadFile({
        url:"/uploadLog",
        fileName:"theFile",
        dragDrop: false,
        uploadStr: "Upload Logs",
        afterUploadAll: updateStats
    });    
});
