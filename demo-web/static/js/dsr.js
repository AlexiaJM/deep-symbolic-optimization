var done = false;
var bestFound = false;
var bestExprs = 0;
var step = 0;
var ajaxCall = 0;

divMainPlot = document.getElementById('main_plot');
divSubplot = document.getElementById('subplot');
divSubplot2 = document.getElementById('subplot2');
divSubplot3 = document.getElementById('subplot3');

function resetPlot(graphDiv){
    /* remove all traces */
    while(graphDiv.data.length>0){
        Plotly.deleteTraces(graphDiv, [0]);
    }
}

function resetButtons(){
    $('#btn_start').parent().show();
    $('#btn_step').parent().show();
    $('#btn_stop').parent().hide();
    $('#btn_pause').parent().hide();

}

var layout_fix_range = {
    'xaxis.autorange': false,
    'yaxis.autorange': false
    };

function plotDataPoints(){
    $.ajax({
        url: '/data_points',
        type: 'POST',
        data: 'training data',
        dataType: "json",
        success: function(response){
            console.log("Plot data points.");
            resetPlot(divMainPlot);
            Plotly.addTraces(divMainPlot, response);
            Plotly.relayout(divMainPlot, layout_fix_range)
        },
        error: function(error){
            console.log(error);
        }
    });
}

/* Plot data points */
$(function(){
    $('#btn_data').on('click', function(){
        plotDataPoints();
        // resetPlot(divSubplot); //TODO: reset logic
        // resetPlot(divSubplot2);
        return false;
    });
});

/* Stop running: Button STOP */
$(function(){
    $('#btn_stop').on('click', function(){
        done = true;
        
        /* Reset */
        resetButtons();
        plotDataPoints();
        resetPlot(divSubplot);
        resetPlot(divSubplot2);

        bestFound = false;
        bestExprs = 0;
        step = 0;
        ajaxCall = 0;
    });
});

/* Pause running: Button PAUSE */
$(function(){
    $('#btn_pause').on('click', function(){
        done = true;
        
        $('#btn_start').parent().show();
        $(this).parent().hide();
        $(this).blur();
    });
});

var subplotBlankData = [{
    x: [],
    y: [],
    type: 'scatter'
}];



function updateExprTable(info){
    var tbl = document.getElementById('tableBodyExprs')
    var row = tbl.insertRow(0);

    var index = tbl.rows.length-1;
    var expression = info.expression
    var fitness = info.fitness
    
    row.insertCell(0).innerHTML = 9-index; // TODO: rank
    row.insertCell(1).innerHTML = expression;
    row.insertCell(2).innerHTML = Number.parseFloat(fitness).toFixed(3);
    row.insertCell(3).innerHTML = "Remove".link("#");
    // row.insertCell(3).innerHTML = '<input type="checkbox" id="checkExpr'+index+'">'+'Remove'.link("#"); // TODO: remove add

    $(function(){
        $('#checkExpr'+index).on('change',function(){
            if ($(this).is(':checked')){
                // row.insertCell(4).innerHTML = 'Remove'
                $(this).parent().parent().addClass('removed-expr')
                row.cells.item(3).innerHTML = "Add".link("#");
            } 
            else{
                // $(this).parent().parent().addClass('removed-expr')
                // row.cells.item(3).innerHTML = '<input type="checkbox" id="checkExpr'+index+'"><small> OUT</small>'
            }
        });
    });
}

var ji = 0; // 
function bringBestExpr(caller){
    $.ajax({
        url: '/main_lines',
        type: 'POST',
        data: JSON.stringify({step: step}),
        contentType: 'application/json;charset=UTF-8',
        dataType: "json",
        success: function(response){
            console.log(step)
            if (response.warn == true){
                console.log("End request: Data not uploaded.");
                alert("Please upload data. (Click upload button first)");
                resetButtons();
                done = true;
            } else {
                if (step%1000 == 0){
                    console.log(step)
                    console.log(ajaxCall)
                }
                
                if (response.update == true && done != true){
                    /* Plot new best expression */
                    bestFound = true;

                    var ii;
                    for (ii = 0; ii < divMainPlot.data.length-1; ii++){
                        Plotly.restyle(divMainPlot, {
                            'line.width': 2,
                            'line.color': '#000000',
                            opacity: Math.pow(0.8, divMainPlot.data.length-1-ii)
                        },ii)
                    }
                    
                    Plotly.addTraces(divMainPlot, JSON.parse(response.plot),divMainPlot.data.length-1);
                    updateExprTable(response.info);

                    bestExprs++;
                }

                /* update training curves */
                for (let [key, value] of Object.entries(response.subplot)) {
                    if (key == 'subplot1'){
                        Plotly.extendTraces(divSubplot, value.data, [0, 1, 2])

                    } else if (key == 'subplot2'){
                        if (step % 50 == 0){
                            var jj;

                            for (jj = ji; jj < divSubplot2.data.length-1; jj++){
                                var opa = Math.pow(0.8,divSubplot2.data.length-jj);
                                if (opa < 0.2){
                                    opa = 0.2;
                                    ji = jj;
                                }
                                Plotly.restyle(divSubplot2, {
                                    opacity: opa
                                },jj)
                            }
                            
                            Plotly.addTraces(divSubplot2, JSON.parse(value[0].reward.data.line));
                        }
                    } else if (key == 'subplot3'){
                        Plotly.extendTraces(divSubplot3, value.data, [0])
                    }
                }

                if (response.done == true){
                    done = true;
                    resetButtons();
                }
            };
        },
        error: function(error){
            console.log(error);
            resetButtons();
            // console.log("Stop requesting");
        }
    }).done(function(){
        if (caller == 'start'){
            if (done != true && ajaxCall < 300){
                // bringBestExpr();
                setTimeout(bringBestExpr.bind(null,'start'), 300);
                step += 10;
                ajaxCall++;
            }
        } else if (caller == 'step'){
            if (bestFound == false && done != true && ajaxCall < 300){
                // bringBestExpr();
                setTimeout(bringBestExpr.bind(null,'step'), 300);
                step += 10;
                ajaxCall++;
            }
        }
    });
}

/* Plot expression: Button STEP (Finds next best expression, then pause) */
$(function(){
    $('#btn_step').on('click', function(){
        $('#btn_stop').parent().show();
        $('#btn_start').parent().show();
        $(this).blur();

        done = false;
        bestFound = false;

        bringBestExpr('step');
        // TODO: change button -> RESUME
    });
});

/* Plot expression: Button START */
$(function(){
    $('#btn_start').on('click', function(){
        console.log("Start");
        
        /* change buttons */
        $('#btn_stop').parent().show();
        $('#btn_pause').parent().show();
        $(this).parent().hide();
        $(this).blur();

        done = false;
        
        /* continue plotting */
        bringBestExpr('start');

        return false;
    });
});



var blankData = [{
    x: [],
    y: [],
    mode: 'marker',
    type: 'scatter',
    line: {
        color: 'rgb(115,115,115)'
    }
}];

var layout = {
    autosize: false, /* long tick labels automatically grow the figure margins */
    margin: { 
        t: 10, 
        l: 50, 
        r: 20, 
        b: 50
    },
    hovermode: 'closest',
    config: { responsive: true }, // TODO: responsive not working..
    // plot_bgcolor:"white",
    // paper_bgcolor:"white",
    showlegend: false,
    // legend: {orientation: "h"},
    xaxis: {
        showgrid: false,
        zeroline: false,
        showline: true,
        mirror: 'ticks',
        // gridcolor: '#bdbdbd',
        // gridwidth: 0.5,
        zerolinecolor: '#969696',
        zerolinewidth: 1,
        linecolor: '#636363',
        linewidth: 2,
        // range: [-2,2]
        autorange: true
      },
    yaxis: {
        showgrid: false,
        zeroline: false,
        showline: true,
        mirror: 'ticks',
        // gridcolor: '#bdbdbd',
        // gridwidth: 0.5,
        zerolinecolor: '#969696',
        zerolinewidth: 1,
        linecolor: '#636363',
        linewidth: 2,
        // range: [-2,2]
        autorange: true
    },
    width: 800,
    height: 500

};
Plotly.newPlot(divMainPlot, blankData, layout, {responsive: true});

/*** Subplots ***/
// not using plotly subplotting
var blankDataSub11 = {
    x: [],
    y: [],
    type: 'scatter',
    mode: 'lines',
    name: 'Best',
    line: {
        dash: 'solid'
    }
};
var blankDataSub12 = {
    x: [],
    y: [],
    type: 'scatter',
    mode: 'lines',
    name: 'Top \u03B5',
    line: {
        dash: 'dash'
    }
};
var blankDataSub13 = {
    x: [],
    y: [],
    type: 'scatter',
    mode: 'lines',
    name: 'Mean',
    line: {
        dash: 'dot'
    }
};
var blankDataSub2 = [{
    x: [],
    y: [],
    type: 'scatter'
}];
var blankDataSub3 = [{
    x: [],
    y: [],
    type: 'scatter'
}];

var layoutSubplot1 = {
    autosize: false,
    margin: { 
        t: 3, 
        l: 80, 
        r: 70, 
        b: 10
    },
    legend: { //TODO: legend blocks lowest line
        orientation: 'h',
        xanchor: 'right',
        yanchor: 'bottom',
        x: 1,
        y: 0,
        bgcolor: 'transparent'
      },
    xaxis: {
        automargin: true,
        title: {
            text: "Iterations",
            font:{
                size: 12
            }
        },
        tickfont: {
            size: 10,
            color: 'black'
        },
        showgrid: false,
        zeroline: false,
        showline: true,
        mirror: 'ticks',
        linecolor: '#636363',
        linewidth: 1.5
      },
    yaxis: {
        title: {
            text: "Reward",
            font:{
                size: 12
            },
        },
        tickfont: {
            size: 10,
            color: 'black'
        },
        showgrid: false,
        zeroline: false,
        showline: true,
        mirror: 'ticks',
        linecolor: '#636363',
        linewidth: 1.5
    },
    width: 580,
    height: 215
};

var layoutSubplot2 = {
    autosize: false,
    margin: { 
        t: 3, 
        l: 80, 
        r: 70, 
        b: 10
    },
    showlegend: false,
    xaxis: {
        automargin: true,
        title: {
            text: "Reward",
            font:{
                size: 12
            }
        },
        tickfont: {
            size: 10,
            color: 'black'
        },
        showgrid: false,
        zeroline: false,
        showline: true,
        mirror: 'ticks',
        linecolor: '#636363',
        linewidth: 1.5
      },
    yaxis: {
        title: {
            text: "Density",
            font:{
                size: 12
            }
        },
        tickfont: {
            size: 10,
            color: 'black'
        },
        showgrid: false,
        zeroline: false,
        showline: true,
        mirror: 'ticks',
        linecolor: '#636363',
        linewidth: 1.5
    },
    width: 580,
    height: 215
};

var layoutSubplot3 = {
    autosize: false,
    margin: { 
        t: 3, 
        l: 80, 
        r: 70, 
        b: 10
    },
    showlegend: false,
    xaxis: {
        automargin: true,
        title: {
            text: "Iterations",
            font:{
                size: 12
            }
        },
        tickfont: {
            size: 10,
            color: 'black'
        },
        showgrid: false,
        zeroline: false,
        showline: true,
        mirror: 'ticks',
        linecolor: '#636363',
        linewidth: 1.5
      },
    yaxis: {
        title: {
            text: "Complexity",
            font:{
                size: 12
            }
        },
        tickfont: {
            size: 10,
            color: 'black'
        },
        showgrid: false,
        zeroline: false,
        showline: true,
        mirror: 'ticks',
        linecolor: '#636363',
        linewidth: 1.5
    },
    width: 580,
    height: 215
};

Plotly.newPlot(divSubplot, [blankDataSub11, blankDataSub12, blankDataSub13], layoutSubplot1)
Plotly.newPlot(divSubplot2, blankDataSub2, layoutSubplot2)
Plotly.newPlot(divSubplot3, blankDataSub3, layoutSubplot3)

/* JS tooltip opt-in */
$(function () {
    $('[data-toggle="tooltip"]').tooltip()
  })



// #f7fcfd
// #e0ecf4
// #bfd3e6
// #9ebcda
// #8c96c6
// #8c6bb1
// #88419d
// #810f7c

// #fcfbfd
// #efedf5
// #dadaeb
// #bcbddc
// #9e9ac8
// #807dba
// #6a51a3
// #54278f
// #3f007d

// #ffffff
// #f0f0f0
// #d9d9d9
// #bdbdbd
// #969696
// #737373
// #525252
// #252525
// #000000


/*
TODO: 
    - model done -> reset numbers
    - stop: force quit model
        - stop plotting
        - reset button
            - remove plot

Need to receive from server: 

- Fill in templates
    - best expression,
    - fitness,
    - iteration #

- data points: scatter

- new expression plot (add trace)

Server:
- Each plot trace w/ hover set

Front:
- static layout
    - bg, ticks, size, templates for current best
- update new scatters
- update old scatter colors
- interactions
    - test w/ step
    - play, pause, stop
    - add, remove

### diagnostics:
- axes match 

Extra
- Restart

*/