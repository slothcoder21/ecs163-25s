let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

let scatterLeft = 0, scatterTop = 0;
let scatterMargin = {top: 10, right: 30, bottom: 30, left: 60},
    scatterWidth = 400 - scatterMargin.left - scatterMargin.right,
    scatterHeight = 350 - scatterMargin.top - scatterMargin.bottom;

let distrLeft = 400, distrTop = 0;
let distrMargin = {top: 10, right: 30, bottom: 30, left: 60},
    distrWidth = 400 - distrMargin.left - distrMargin.right,
    distrHeight = 350 - distrMargin.top - distrMargin.bottom;

let teamLeft = 0, teamTop = 400;
let teamMargin = {top: 10, right: 30, bottom: 30, left: 60},
    teamWidth = width - teamMargin.left - teamMargin.right,
    teamHeight = height-450 - teamMargin.top - teamMargin.bottom;

// plots
d3.csv("players.csv").then(rawData =>{
    console.log("rawData", rawData);

    rawData.forEach(function(d){
        d.AB = Number(d.AB);
        d.H = Number(d.H);
        d.salary = Number(d.salary);
        d.SO = Number(d.SO);
    });


    const filteredData = rawData.filter(d=>d.AB>abFilter);
    const processedData = filteredData.map(d=>{
                          return {
                              "H_AB":d.H/d.AB,
                              "SO_AB":d.SO/d.AB,
                              "teamID":d.teamID,
                          };
    });
    console.log("processedData", processedData);

    //plot 1: Scatter Plot
    const svg = d3.select("svg");

    const g1 = svg.append("g")
                .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
                .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
                .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`);

    // X label
    g1.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + 50)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("H/AB");


    // Y label
    g1.append("text")
    .attr("x", -(scatterHeight / 2))
    .attr("y", -40)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("SO/AB");

    // X ticks
    const x1 = d3.scaleLinear()
    .domain([0, d3.max(processedData, d => d.H_AB)])
    .range([0, scatterWidth]);

    const xAxisCall = d3.axisBottom(x1)
                        .ticks(7);
    g1.append("g")
    .attr("transform", `translate(0, ${scatterHeight})`)
    .call(xAxisCall)
    .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");

    // Y ticks
    const y1 = d3.scaleLinear()
    .domain([0, d3.max(processedData, d => d.SO_AB)])
    .range([scatterHeight, 0]);

    const yAxisCall = d3.axisLeft(y1)
                        .ticks(13);
    g1.append("g").call(yAxisCall);

    // circles
    const circles = g1.selectAll("circle").data(processedData);

    circles.enter().append("circle")
         .attr("cx", d => x1(d.H_AB))
         .attr("cy", d => y1(d.SO_AB))
         .attr("r", 5)
         .attr("fill", "#69b3a2");

    const g2 = svg.append("g")
                .attr("width", distrWidth + distrMargin.left + distrMargin.right)
                .attr("height", distrHeight + distrMargin.top + distrMargin.bottom)
                .attr("transform", `translate(${distrLeft}, ${distrTop})`);

    //plot 2: Bar Chart for Team Player Count

    const teamCounts = processedData.reduce((s, { teamID }) => (s[teamID] = (s[teamID] || 0) + 1, s), {});
    const teamData = Object.keys(teamCounts).map((key) => ({ teamID: key, count: teamCounts[key] }));
    console.log("teamData", teamData);


    const g3 = svg.append("g")
                .attr("width", teamWidth + teamMargin.left + teamMargin.right)
                .attr("height", teamHeight + teamMargin.top + teamMargin.bottom)
                .attr("transform", `translate(${teamMargin.left}, ${teamTop})`);

    // X label
    g3.append("text")
    .attr("x", teamWidth / 2)
    .attr("y", teamHeight + 50)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Team");


    // Y label
    g3.append("text")
    .attr("x", -(teamHeight / 2))
    .attr("y", -40)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Number of players");

    // X ticks
    const x2 = d3.scaleBand()
    .domain(teamData.map(d => d.teamID))
    .range([0, teamWidth])
    .paddingInner(0.3)
    .paddingOuter(0.2);

    const xAxisCall2 = d3.axisBottom(x2);
    g3.append("g")
    .attr("transform", `translate(0, ${teamHeight})`)
    .call(xAxisCall2)
    .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");

    // Y ticks
    const y2 = d3.scaleLinear()
    .domain([0, d3.max(teamData, d => d.count)])
    .range([teamHeight, 0])
    .nice();

    const yAxisCall2 = d3.axisLeft(y2)
                        .ticks(6);
    g3.append("g").call(yAxisCall2);

    // bars
    const bars = g3.selectAll("rect").data(teamData);

    bars.enter().append("rect")
    .attr("y", d => y2(d.count))
    .attr("x", d => x2(d.teamID))
    .attr("width", x2.bandwidth())
    .attr("height", d => teamHeight - y2(d.count))
    .attr("fill", "steelblue");


    }).catch(function(error){
    console.log(error);
});