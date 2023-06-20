#Need to add doc strings and such

using Pkg
Pkg.add("MusicXML")
Pkg.add("EzXML")

using MusicXML
using EzXML

#file = "C:\\Users\\stone\\Desktop\\julia_music\\52nd Street Theme.musicxml"
file = "C:\\Users\\stone\\Downloads\\Give A Little Bit.musicxml"

score = readmusicxml_partial(file)
#println(score)

println(nodecontent.(findall("//work-title", score)))

chord = []
for harmony in nodecontent.(findall("//root-step", score))
    push!(chord,harmony)
end
alter = []
for harmony in nodecontent.(findall("//root-alter", score))
    push!(alter,harmony)
end
flavor = []
for harmony in nodecontent.(findall("//kind/text()", score))
    push!(flavor, harmony)
end
println(chord)
println(alter)
println(flavor)
