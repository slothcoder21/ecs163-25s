/*
  d3 reference:


  d3.select() for selecting DOM elements
  d3.csv() for loading CSV data
  d3.scaleLinear(), d3.scaleOrdinal(), and d3.scalePoint() for creating scales
  d3.extent() for finding min/max values
  d3.schemeCategory10 for color schemes
  d3.axisBottom() / d3.axisLeft() for creating axes
  d3.pie() and d3.arc() for creating pie/donut charts
  d3.nest() for data aggregation
  d3.line() for creating line generators
 */

const svg = d3.select("svg"); //main canvas
const tooltip = d3.select(".tooltip");//tooltip for the scatter plot
// Retrieve current SVG dimensions
const { width, height } = svg.node().getBoundingClientRect();

// Layout partitions: left (scatter + donut), bottom-right (parallel coords)
const leftWidth    = width * 0.4;
const rightWidth   = width - leftWidth;
const topHeight    = height * 0.5;
const bottomHeight = height - topHeight;

const margin = { top: 40, right: 20, bottom: 40, left: 60 };
const color  = d3.scaleOrdinal(d3.schemeCategory10);

d3.csv("pokemon.csv").then(data => {
  data.forEach(d => {
    d.Attack      = +d.Attack;
    d.Defense     = +d.Defense;
    d.HP          = +d.HP;
    d.Sp_Atk      = +d.Sp_Atk;
    d.Sp_Def      = +d.Sp_Def;
    d.Speed       = +d.Speed;
    d.isLegendary = (d.isLegendary === 'True');
  });

  const types = Array.from(new Set(data.map(d => d.Type_1))).sort();
  color.domain(types);

  // --- Scatter Plot ---
  const scatterG = svg.append("g").attr("transform", `translate(0,0)`);
  const sx = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Attack)).nice()
    .range([margin.left, leftWidth - margin.right]);

  const sy = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Defense)).nice()
    .range([topHeight - margin.bottom, margin.top]);

  scatterG.append("g")
    .attr("transform", `translate(0,${topHeight - margin.bottom})`)
    .call(d3.axisBottom(sx).ticks(6));
  scatterG.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(sy).ticks(6));

  scatterG.append("text")
    .attr("class", "axis-label")
    .attr("x", leftWidth / 2)
    .attr("y", topHeight - 5)
    .attr("text-anchor", "middle")
    .text("Attack");

  scatterG.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -topHeight / 2)
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .text("Defense");

  scatterG.append("text")
    .attr("class", "view-title")
    .attr("x", leftWidth / 2)
    .attr("y", margin.top - 20)
    .text("Attack vs Defense by Primary Type");

    scatterG.selectAll("circle")
    .data(data)
    .enter().append("circle")
    .attr("cx", d => sx(d.Attack))
    .attr("cy", d => sy(d.Defense))
    .attr("r", 4)
    .attr("fill", d => color(d.Type_1))
    .on("mouseover", (e, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(`<strong>${d.Name}</strong><br>${d.Type_1}<br>Atk: ${d.Attack}, Def: ${d.Defense}`)
             .style("left", `${e.pageX + 5}px`)
             .style("top", `${e.pageY - 28}px`);
    })

  // Legend for the Scatter Plot
  const legend = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${topHeight + 10})`);

  const sw = 8, padX = 60, padY = 20, perRow = 5;

  types.forEach((t, i) => {
    const col = i % perRow,
          row = Math.floor(i / perRow),
          g   = legend.append("g").attr("transform", `translate(${col * padX}, ${row * padY})`);

    g.append("rect").attr("width", sw).attr("height", sw).attr("fill", color(t));
    g.append("text")
      .attr("x", sw + 4)
      .attr("y", sw - 1)
      .attr("font-size", "10px")
      .text(t);
  });

  // Donut Chart
  // this is to see the distribution of legendary vs non-legendary in percentages
  const donutG = svg.append("g")
    .attr("transform", `translate(${leftWidth/2}, ${topHeight + bottomHeight/2})`);

  const legendData = d3.nest()
    .key(d => d.isLegendary)
    .rollup(v => v.length)
    .entries(data);

  const pie = d3.pie().value(d => d.value);
  const arc = d3.arc().innerRadius(40).outerRadius(80);
  const arcs = donutG.selectAll(".arc").data(pie(legendData)).enter().append("g").attr("class", "arc");

  arcs.append("path").attr("d", arc)
    .attr("fill", d => d.data.key === 'true' ? "#ff7f0e" : "#1f77b4");

  arcs.append("text")
    .attr("transform", d => `translate(${arc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text(d => `${d.data.key==='true'?'Legendary':'Normal'} (${d.data.value})`);

  donutG.append("text")
    .attr("class", "view-title")
    .attr("x", 0)
    .attr("y", -100)
    .text("Legendary vs Non-Legendary");

  // Parallel Coordinates
  // this is to see the relationship between the stats of each pokemon in the dataset
  const pw = rightWidth - margin.left - margin.right;
  const ph = bottomHeight - margin.top - margin.bottom;
  const parallelG = svg.append("g")
    .attr("transform", `translate(${leftWidth + margin.left}, ${topHeight + margin.top})`);

  const dims = ["HP", "Attack", "Defense", "Atk", "Def", "Speed"];
  const yScales = {};
  dims.forEach(dim => {
    yScales[dim] = d3.scaleLinear()
      .domain(d3.extent(data, p => p[dim])).nice()
      .range([ph, 0]);
  });

  const xScale = d3.scalePoint()
    .domain(dims)
    .range([0, pw]);

  const lineGen = d3.line();
  parallelG.selectAll("path")
    .data(data)
    .enter().append("path")
    .attr("d", d => lineGen(dims.map(p => [xScale(p), yScales[p](d[p])])))
    .attr("fill", "none")
    .attr("stroke", d => color(d.Type_1))
    .attr("stroke-opacity", 0.3);

  dims.forEach(dim => {
    const gAxis = parallelG.append("g")
      .attr("transform", `translate(${xScale(dim)}, 0)`);

    // draw the axis
    gAxis.call(d3.axisLeft(yScales[dim]).ticks(4));

    // label above axis line
    gAxis.append("text")
      .attr("class", "axis-label")
      .attr("text-anchor", "middle")
      .attr("x", 0)
      .attr("y", -10)
      .attr("fill", "#000")
      .attr("font-size", "10px")
      .text(dim);
  });

  parallelG.append("text")
    .attr("class", "view-title")
    .attr(`x`, pw / 2)
    .attr(`y`, -margin.top / 2)
    .text("Stat Profiles (Parallel Coordinates)");
});
